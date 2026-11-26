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
    async def rag(disease=None, crop=None):
        return "ctx"
    monkeypatch.setattr(scan, "query_disease_knowledge", rag)


def make_client():
    app = FastAPI()
    app.include_router(scan.router, prefix="/scan")
    return TestClient(app)


def post(client):
    return client.post("/scan/analyze", files={"image": ("a.jpg", b"123", "image/jpeg")})


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


def test_route_missing_is_plant_is_error_not_healthy(monkeypatch):
    async def odd(_): return {"disease_detected": False, "confidence": 95}
    monkeypatch.setattr(scan, "analyze_image", odd)
    assert post(make_client()).status_code == 502


def test_route_missing_confidence_is_uncertain_not_healthy(monkeypatch):
    async def odd(_): return {"is_plant": True, "disease_detected": False}
    monkeypatch.setattr(scan, "analyze_image", odd)
    assert post(make_client()).json()["status"] == "uncertain"


def test_hung_model_call_times_out_once_without_overlapping_retries(monkeypatch):
    import time
    monkeypatch.setattr(detection, "MODEL_TIMEOUT_SECONDS", 0.05)
    monkeypatch.setattr(detection, "WAIT_GRACE_SECONDS", 0)
    monkeypatch.setattr(detection, "RETRY_BACKOFF_SECONDS", 0)
    calls = []

    class Hang:
        def __init__(self, *a, **k): pass
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
