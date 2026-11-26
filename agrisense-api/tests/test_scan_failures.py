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

def test_analyze_image_raises_when_model_call_fails(monkeypatch):
    class Boom:
        def __init__(self, *a, **k): pass
        def generate_content(self, *a, **k): raise RuntimeError("quota secret-detail")
    monkeypatch.setattr(detection.genai, "GenerativeModel", Boom)
    with pytest.raises(AnalysisError) as exc:
        asyncio.run(detection.analyze_image(b"not-an-image"))
    assert "secret-detail" not in str(exc.value)


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
