import json
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import scan
from app.services import treatment
from app.services.treatment import TreatmentError, parse_treatment, generate_treatment

PLAN = {
    "immediate_action": "Remove infected leaves",
    "organic_treatment": {"method": "Neem spray", "materials": ["neem oil"], "dosage": "5 ml/L"},
    "chemical_treatment": {"product": "X", "active_ingredient": "Y", "dosage": "2 g/L"},
    "prevention_tips": ["Rotate crops"],
    "recovery_timeline": "7-10 days",
    "warning_signs": "Spreading spots",
}
GOOD = {
    "is_plant": True, "disease_detected": True, "disease_name": "Leaf Blight", "crop_type": "Rice",
    "confidence": 90, "affected_area_percent": 20, "visible_symptoms": ["spots"],
    "urgency": "High", "reasoning": "r",
}
SECRET = "SECRET-INTERNAL-DETAIL"


import io as _io
from PIL import Image as _Im
_b = _io.BytesIO(); _Im.new("RGB", (64, 48)).save(_b, "PNG"); _PNG = _b.getvalue()


def client():
    app = FastAPI()
    app.include_router(scan.router, prefix="/scan")
    return TestClient(app)


def post(c):
    return c.post("/scan/analyze", files={"image": ("a.png", _PNG, "image/png")},
                  headers={"X-Access-Key": "test-access-key"})


@pytest.fixture(autouse=True)
def _stubs(monkeypatch):
    async def rag(disease=None, crop=None, **kw):
        return "ctx [source-verified]"  # these tests exercise the treatment path, which needs a checked source

    async def ok(_):
        return GOOD

    monkeypatch.setattr(scan, "query_disease_knowledge", rag)
    monkeypatch.setattr(scan, "analyze_image", ok)


def test_parse_valid_plan():
    assert parse_treatment(json.dumps(PLAN))["recovery_timeline"] != "7-10 days"


def test_parse_strips_fence():
    assert parse_treatment("```json\n" + json.dumps(PLAN) + "\n```")["immediate_action"]


@pytest.mark.parametrize("bad", ["", "not json", "{}", json.dumps({**PLAN, "prevention_tips": "x"})])
def test_parse_rejects_unusable(bad):
    with pytest.raises(TreatmentError):
        parse_treatment(bad)


def test_generate_wraps_provider_error_without_leaking(monkeypatch):
    import asyncio

    class Boom:
        def __init__(self, *_): pass
        def count_tokens(self, *_, **__):
            class T: total_tokens = 100
            return T()
        def generate_content(self, *_, **__): raise RuntimeError(SECRET)

    monkeypatch.setattr(treatment.genai, "GenerativeModel", Boom)
    with pytest.raises(TreatmentError) as e:
        asyncio.run(generate_treatment(GOOD, "ctx"))
    assert SECRET not in str(e.value)


def test_model_name_comes_from_settings(monkeypatch):
    import asyncio
    seen = []

    class M:
        def __init__(self, name): seen.append(name)
        def count_tokens(self, *_, **__):
            class T: total_tokens = 100
            return T()
        def generate_content(self, *_, **__):
            class R: text = json.dumps(PLAN)
            return R()

    monkeypatch.setattr(treatment.genai, "GenerativeModel", M)
    monkeypatch.setattr(treatment.settings, "GEMINI_MODEL", "custom-model")
    asyncio.run(generate_treatment(GOOD, "ctx"))
    assert seen == ["custom-model"]


def test_route_treatment_failure_keeps_diagnosis_and_leaks_nothing(monkeypatch):
    async def fail(*a, **k): raise TreatmentError("Treatment generation failed")

    monkeypatch.setattr(scan, "generate_treatment", fail)
    r = post(client())
    body = r.json()
    assert r.status_code == 200
    assert body["status"] == "disease_detected" and body["treatment"] is None
    assert body["analysis"]["disease_name"] == "Leaf Blight"
    assert body["treatment_message"] and "error" not in body["treatment_message"].lower()


def test_route_unexpected_treatment_exception_is_generic_500(monkeypatch):
    async def fail(*a, **k): raise RuntimeError(SECRET)

    monkeypatch.setattr(scan, "generate_treatment", fail)
    r = post(client())
    assert r.status_code == 500 and SECRET not in r.text


def test_default_model_is_gemini_3_5_flash_lite():
    from app.core.config import Settings
    assert Settings.model_fields["GEMINI_MODEL"].default == "gemini-3.5-flash-lite"
