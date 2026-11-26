import asyncio
import json
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import scan
from app.services import detection
from app.services.detection import AnalysisError, parse_analysis

GOOD = {
    "disease_detected": True, "disease_name": "Leaf Blight", "crop_type": "Rice",
    "confidence": 90, "affected_area_percent": 20, "visible_symptoms": ["spots"],
    "urgency": "High", "reasoning": "r",
}


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


def test_schema_fills_defaults_for_healthy_result():
    out = parse_analysis(json.dumps({"disease_detected": False}))
    assert out["is_plant"] is True and out["crop_type"] == "Unknown" and out["visible_symptoms"] == []


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


def test_disease_path_still_works(monkeypatch):
    async def ok(_): return GOOD
    monkeypatch.setattr(scan, "analyze_image", ok)
    r = post(make_client())
    body = r.json()
    assert r.status_code == 200 and body["status"] == "disease_detected"
    assert body["treatment"] and body["voice_data"]
