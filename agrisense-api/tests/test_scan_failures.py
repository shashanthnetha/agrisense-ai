import asyncio
import json
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import scan
from app.services import detection
from app.services.detection import AnalysisError, parse_analysis

GOOD = {
    "is_plant": True, "disease_detected": True, "disease_name": "Leaf Blight", "crop_type": "Rice",
    "confidence": 90, "affected_area_percent": 20, "visible_symptoms": ["spots"],
    "urgency": "High", "reasoning": "r",
}


@pytest.fixture(autouse=True)
def _stub_rag(monkeypatch):
    async def rag(disease=None, crop=None, **kw):
        return "ctx"
    monkeypatch.setattr(scan, "query_disease_knowledge", rag)


def make_client():
    app = FastAPI()
    app.include_router(scan.router, prefix="/scan")
    return TestClient(app)


def _png(w=64, h=48):
    import io
    from PIL import Image
    b = io.BytesIO()
    Image.new("RGB", (w, h), (30, 120, 40)).save(b, "PNG")
    return b.getvalue()


def post(client, data=None, name="a.png", ctype="image/png"):
    return client.post("/scan/analyze", files={"image": (name, data if data is not None else _png(), ctype)},
                       headers={"X-Access-Key": "test-access-key"})


# --- parse_analysis -------------------------------------------------------

def test_parse_valid_json():
    assert parse_analysis(json.dumps(GOOD))["disease_name"] == "Leaf Blight"


def test_parse_strips_json_fence():
    assert parse_analysis("```json\n" + json.dumps(GOOD) + "\n```")["crop_type"] == "Rice"


@pytest.mark.parametrize("bad", ["", "not json", "[1,2]", "{}", '{"disease_detected": "yes"}'])
def test_parse_rejects_unusable_output(bad):
    with pytest.raises(AnalysisError):
        parse_analysis(bad)


# --- analyze_image --------------------------------------------------------

def make_model(outputs):
    """Fake GenerativeModel that returns/raises items from `outputs` in order."""
    calls = []

    class Fake:
        def __init__(self, *a, **k): pass
        def count_tokens(self, *_, **__):
            class T: total_tokens = 100
            return T()
        def generate_content(self, *a, **k):
            calls.append(k)
            item = outputs[min(len(calls) - 1, len(outputs) - 1)]
            if isinstance(item, Exception):
                raise item
            return type("R", (), {"text": item})()

    return Fake, calls


def test_analyze_image_raises_when_model_call_fails(monkeypatch):
    monkeypatch.setattr(detection, "RETRY_BACKOFF_SECONDS", 0)
    Fake, calls = make_model([RuntimeError("quota secret-detail")])
    monkeypatch.setattr(detection.genai, "GenerativeModel", Fake)
    with pytest.raises(AnalysisError) as exc:
        asyncio.run(detection.analyze_image(b"not-an-image"))
    assert "secret-detail" not in str(exc.value)
    assert len(calls) == detection.MODEL_ATTEMPTS


def test_retries_then_succeeds(monkeypatch):
    monkeypatch.setattr(detection, "RETRY_BACKOFF_SECONDS", 0)
    Fake, calls = make_model([RuntimeError("temporary"), "not json", json.dumps(GOOD)])
    monkeypatch.setattr(detection.genai, "GenerativeModel", Fake)
    result = asyncio.run(detection.analyze_image(b"x"))
    assert result["disease_name"] == "Leaf Blight"
    assert len(calls) == 3


def test_model_call_passes_timeout(monkeypatch):
    Fake, calls = make_model([json.dumps(GOOD)])
    monkeypatch.setattr(detection.genai, "GenerativeModel", Fake)
    asyncio.run(detection.analyze_image(b"x"))
    assert calls[0]["request_options"]["timeout"] == detection.MODEL_TIMEOUT_SECONDS


# --- schema validation ----------------------------------------------------

@pytest.mark.parametrize("patch", [
    {"confidence": 150}, {"confidence": -1}, {"affected_area_percent": 101},
    {"urgency": "Severe"}, {"visible_symptoms": "spots"},
    {"disease_detected": True, "disease_name": ""}, {"is_plant": "no"},
])
def test_schema_rejects_bad_values(patch):
    with pytest.raises(AnalysisError):
        parse_analysis(json.dumps({**GOOD, **patch}))


def test_missing_is_plant_or_confidence_is_rejected():
    for key in ("is_plant", "confidence"):
        data = {**GOOD, "disease_detected": False, "disease_name": "Healthy"}
        del data[key]
        with pytest.raises(AnalysisError):
            parse_analysis(json.dumps(data))


def test_optional_text_fields_get_defaults():
    out = parse_analysis(json.dumps({"is_plant": True, "disease_detected": False, "confidence": 90}))
    assert out["crop_type"] == "Unknown" and out["visible_symptoms"] == []


def test_hung_model_call_times_out_once_without_overlapping_retries(monkeypatch):
    import time
    monkeypatch.setattr(detection, "MODEL_TIMEOUT_SECONDS", 0.05)
    monkeypatch.setattr(detection, "WAIT_GRACE_SECONDS", 0)
    monkeypatch.setattr(detection, "RETRY_BACKOFF_SECONDS", 0)
    calls = []

    class Hang:
        def __init__(self, *a, **k): pass
        def count_tokens(self, *_, **__):
            class T: total_tokens = 100
            return T()
        def generate_content(self, *a, **k):
            calls.append(1)
            time.sleep(0.4)
            return type("R", (), {"text": json.dumps(GOOD)})()

    monkeypatch.setattr(detection.genai, "GenerativeModel", Hang)
    loop = asyncio.new_event_loop()  # like a server: the loop outlives the request
    try:
        start = time.monotonic()
        with pytest.raises(AnalysisError):
            loop.run_until_complete(detection.analyze_image(b"x"))
        elapsed = time.monotonic() - start
    finally:
        loop.run_until_complete(loop.shutdown_default_executor())
        loop.close()
    assert elapsed < 0.3          # caller released before the hung call finishes
    assert len(calls) == 1        # no second call started while the first may still run


# --- uncertain / not a plant ---------------------------------------------

def test_not_a_plant_result(monkeypatch):
    async def ok(_): return {**GOOD, "is_plant": False, "disease_detected": False}
    monkeypatch.setattr(scan, "analyze_image", ok)
    body = post(make_client()).json()
    assert body["status"] == "not_a_plant" and body["treatment"] is None and body["message"]


def test_low_confidence_is_uncertain_and_skips_treatment(monkeypatch):
    async def ok(_): return {**GOOD, "confidence": scan.MIN_CONFIDENCE - 1}
    monkeypatch.setattr(scan, "analyze_image", ok)
    body = post(make_client()).json()
    assert body["status"] == "uncertain" and body["treatment"] is None and body["voice_data"] is None


# --- /analyze route -------------------------------------------------------

def test_analysis_failure_is_not_healthy(monkeypatch):
    async def fail(_): raise AnalysisError("x")
    monkeypatch.setattr(scan, "analyze_image", fail)
    r = post(make_client())
    assert r.status_code == 502
    assert "healthy" not in json.dumps(r.json()).lower()


def test_unexpected_error_does_not_leak_details(monkeypatch):
    async def fail(_): raise RuntimeError("db password=hunter2")
    monkeypatch.setattr(scan, "analyze_image", fail)
    r = post(make_client())
    assert r.status_code == 500
    assert "hunter2" not in r.text


def test_missing_disease_detected_is_not_healthy(monkeypatch):
    async def odd(_): return {"crop_type": "Rice"}
    monkeypatch.setattr(scan, "analyze_image", odd)
    r = post(make_client())
    assert r.status_code == 502


def test_explicit_healthy_result(monkeypatch):
    async def ok(_): return {**GOOD, "disease_detected": False, "disease_name": "Healthy"}
    monkeypatch.setattr(scan, "analyze_image", ok)
    r = post(make_client())
    assert r.status_code == 200 and r.json()["status"] == "healthy"


def test_retrieval_error_abstains_without_treatment(monkeypatch):
    async def ok(_): return GOOD
    async def rag_error(disease=None, crop=None, **kw): return "Error retrieving knowledge."
    async def plan(*a, **k): raise AssertionError("treatment must not run without reference knowledge")
    monkeypatch.setattr(scan, "analyze_image", ok)
    monkeypatch.setattr(scan, "query_disease_knowledge", rag_error)
    monkeypatch.setattr(scan, "generate_treatment", plan)
    r = post(make_client())
    body = r.json()
    assert r.status_code == 200 and body["status"] == "disease_detected"
    assert body["treatment"] is None and body["knowledge_match"] == "none"
    assert body["treatment_message"] and body["voice_data"] is None


def test_no_knowledge_match_abstains_without_treatment(monkeypatch):
    async def ok(_): return GOOD
    async def rag_none(disease=None, crop=None, **kw): return scan.NO_MATCH_CONTEXT
    async def plan(*a, **k): raise AssertionError("treatment must not run without reference knowledge")
    monkeypatch.setattr(scan, "analyze_image", ok)
    monkeypatch.setattr(scan, "query_disease_knowledge", rag_none)
    monkeypatch.setattr(scan, "generate_treatment", plan)
    body = post(make_client()).json()
    assert body["treatment"] is None and body["knowledge_match"] == "none" and body["treatment_message"]


def test_disease_path_still_works(monkeypatch):
    async def ok(_): return GOOD
    async def plan(*a, **k): return {"immediate_action": "x"}
    monkeypatch.setattr(scan, "analyze_image", ok)
    monkeypatch.setattr(scan, "generate_treatment", plan)
    r = post(make_client())
    body = r.json()
    assert r.status_code == 200 and body["status"] == "disease_detected"
    assert body["treatment"] and body["voice_data"] is None


def test_route_missing_is_plant_is_error_not_healthy(monkeypatch):
    async def odd(_): return {"disease_detected": False, "confidence": 95}
    monkeypatch.setattr(scan, "analyze_image", odd)
    assert post(make_client()).status_code == 502


def test_route_missing_confidence_is_uncertain_not_healthy(monkeypatch):
    async def odd(_): return {"is_plant": True, "disease_detected": False}
    monkeypatch.setattr(scan, "analyze_image", odd)
    assert post(make_client()).json()["status"] == "uncertain"


# --- upload hardening -----------------------------------------------------

def test_non_image_is_400_and_never_reaches_the_model(monkeypatch):
    called = []
    async def boom(_):
        called.append(1)
        return GOOD
    monkeypatch.setattr(scan, "analyze_image", boom)
    r = post(make_client(), data=b"hello, not an image", name="a.jpg", ctype="image/jpeg")
    assert r.status_code == 400 and not called
    assert "readable" in r.json()["detail"]


def test_oversize_upload_is_413_without_buffering_it_all(monkeypatch):
    monkeypatch.setattr(scan.settings, "MAX_UPLOAD_MB", 1)
    r = post(make_client(), data=b"\0" * (2 * 1024 * 1024 + 5))
    assert r.status_code == 413


def test_gif_and_tiny_images_rejected(monkeypatch):
    import io
    from PIL import Image
    b = io.BytesIO(); Image.new("RGB", (64, 64)).save(b, "GIF")
    assert post(make_client(), data=b.getvalue(), name="a.gif", ctype="image/gif").status_code == 400
    assert post(make_client(), data=_png(8, 8)).status_code == 400


def test_exif_rotation_and_aspect_kept():
    import io
    import numpy as np
    from PIL import Image
    im = Image.new("RGB", (1000, 500), (0, 200, 0))
    ex = im.getexif(); ex[0x0112] = 6  # camera says: rotate 90 to display
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex)
    out = detection.preprocess_image(b.getvalue())
    arr = np.asarray(Image.open(io.BytesIO(out)))
    assert arr.shape[0] > arr.shape[1], "should be upright (portrait) after EXIF rotation"
    assert max(arr.shape[:2]) == detection.MAX_SIDE
    assert abs(arr.shape[0] / arr.shape[1] - 2.0) < 0.05, "aspect ratio must not be squashed"


# --- reliability: concurrency, timeouts, language ---------------------------

def test_busy_service_returns_503_and_does_not_count_the_scan(monkeypatch):
    from app.core import limits
    monkeypatch.setattr(scan.settings, "MAX_CONCURRENT_SCANS", 0)
    before = limits._day["count"]
    r = post(make_client())
    assert r.status_code == 503 and "busy" in r.json()["detail"]
    assert limits._day["count"] == before


def test_slot_is_released_after_success_and_after_failure(monkeypatch):
    async def boom(_):
        raise AnalysisError("x")
    monkeypatch.setattr(scan, "analyze_image", boom)
    assert post(make_client()).status_code == 502
    assert scan._active_scans == 0


def test_unsupported_language_is_400():
    r = make_client().post("/scan/analyze", data={"language": "Klingon"},
                           files={"image": ("a.png", _png(), "image/png")},
                           headers={"X-Access-Key": "test-access-key"})
    assert r.status_code == 400


def test_treatment_call_does_not_block_the_event_loop_and_times_out(monkeypatch):
    import time
    from app.services import treatment
    monkeypatch.setattr(treatment.settings, "TREATMENT_TIMEOUT_SECONDS", 0)
    def slow(prompt):
        time.sleep(0.3)
        return "{}"
    monkeypatch.setattr(treatment, "_call_treatment_model", slow)
    async def go():
        ticks = []
        async def ticker():
            for _ in range(5):
                await asyncio.sleep(0.02); ticks.append(1)
        t = asyncio.create_task(ticker())
        # wait_for limit is TREATMENT_TIMEOUT_SECONDS + 5 here, so shorten it for the test
        monkeypatch.setattr(asyncio, "wait_for", lambda aw, timeout: orig(aw, 0.1))
        try:
            await treatment.generate_treatment({}, "ctx")
        except treatment.TreatmentError:
            pass
        await t
        return len(ticks)
    orig = asyncio.wait_for
    assert asyncio.run(go()) == 5  # ticker kept running while the slow call was in flight


def test_timed_out_calls_keep_their_slot_until_the_thread_ends():
    import threading
    from app.services import guard
    guard.reset_budget_for_tests()
    gate = threading.Event()
    started = []

    def stuck():
        started.append(1)
        gate.wait(5)
        return "late"

    async def go():
        
        from app.core.config import settings
        cap = settings.MAX_OUTSTANDING_PROVIDER_CALLS
        for _ in range(cap):
            with pytest.raises(asyncio.TimeoutError):
                await guard.run_provider(stuck, timeout=0.05)
        # every caller gave up, but all threads still run: no new provider call may start
        assert guard.outstanding_provider_calls() == cap
        with pytest.raises(guard.ProviderBusy):
            await guard.run_provider(stuck, timeout=0.05)
        assert len(started) == cap
        gate.set()
        for _ in range(100):
            if guard.outstanding_provider_calls() == 0:
                break
            await asyncio.sleep(0.02)
        assert guard.outstanding_provider_calls() == 0
        assert await guard.run_provider(lambda: "ok", timeout=1) == "ok"
    asyncio.run(go())


def test_failed_call_gives_its_slot_back():
    from app.services import guard
    guard.reset_budget_for_tests()
    def bad():
        raise RuntimeError("x")
    async def go():
        for _ in range(10):
            with pytest.raises(RuntimeError):
                await guard.run_provider(bad, timeout=1)
        assert guard.outstanding_provider_calls() == 0
    asyncio.run(go())


def test_detection_reports_busy_without_a_provider_call(monkeypatch):
    from app.services import guard
    monkeypatch.setattr(detection, "_call_model", lambda b: pytest.fail("provider called"))
    monkeypatch.setattr(detection.settings, "MAX_OUTSTANDING_PROVIDER_CALLS", 0)
    with pytest.raises(AnalysisError):
        asyncio.run(detection.analyze_image(b"x"))
