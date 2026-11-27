import asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import scan, voice
from app.core import limits
from app.core.config import settings

KEY = {"X-Access-Key": "test-access-key"}
import io as _io
from PIL import Image as _Im
_b = _io.BytesIO(); _Im.new("RGB", (64, 48)).save(_b, "PNG"); _PNG = _b.getvalue()
IMG = {"image": ("a.png", _PNG, "image/png")}


def scan_client():
    app = FastAPI()
    app.include_router(scan.router, prefix="/scan")
    return TestClient(app)


def voice_client():
    app = FastAPI()
    app.include_router(voice.router, prefix="/voice")
    return TestClient(app)


def _fail_if_called(monkeypatch):
    called = []

    async def spy(*a, **k):
        called.append(1)
        return {"is_plant": False}
    monkeypatch.setattr(scan, "analyze_image", spy)
    return called


def test_scan_is_closed_without_key_and_makes_no_paid_call(monkeypatch):
    called = _fail_if_called(monkeypatch)
    assert scan_client().post("/scan/analyze", files=IMG).status_code == 401
    assert scan_client().post("/scan/analyze", files=IMG, headers={"X-Access-Key": "wrong"}).status_code == 401
    assert called == []


def test_scan_refused_when_no_access_key_configured(monkeypatch):
    called = _fail_if_called(monkeypatch)
    monkeypatch.setattr(settings, "ACCESS_KEY", None)
    assert scan_client().post("/scan/analyze", files=IMG, headers=KEY).status_code == 503
    assert called == []


def test_voice_route_needs_key_and_makes_no_paid_call(monkeypatch):
    called = []

    async def spy(*a, **k):
        called.append(1)
        return b"x"
    monkeypatch.setattr(voice, "generate_voice", spy)
    body = {"analysis": {}, "treatment": {}}
    assert voice_client().post("/voice/generate", json=body).status_code == 401
    monkeypatch.setattr(settings, "ACCESS_KEY", None)
    assert voice_client().post("/voice/generate", json=body, headers=KEY).status_code == 503
    assert called == []


def test_per_ip_hourly_limit(monkeypatch):
    _fail_if_called(monkeypatch)
    monkeypatch.setattr(settings, "SCANS_PER_IP_PER_HOUR", 2)
    c = scan_client()
    codes = [c.post("/scan/analyze", files=IMG, headers=KEY).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_daily_cap(monkeypatch):
    called = _fail_if_called(monkeypatch)
    monkeypatch.setattr(settings, "SCANS_PER_IP_PER_HOUR", 99)
    monkeypatch.setattr(settings, "DAILY_SCAN_CAP", 2)
    c = scan_client()
    codes = [c.post("/scan/analyze", files=IMG, headers=KEY).status_code for _ in range(3)]
    assert codes == [200, 200, 429] and len(called) == 2


def test_oversize_upload_rejected_before_paid_call(monkeypatch):
    called = _fail_if_called(monkeypatch)
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 0)
    r = scan_client().post("/scan/analyze", files=IMG, headers=KEY)
    assert r.status_code == 413 and called == []


def test_monthly_voice_cap_on_voice_route(monkeypatch):
    called = []

    async def spy(*a, **k):
        called.append(1)
        return b"x"
    monkeypatch.setattr(voice, "generate_voice", spy)
    monkeypatch.setattr(settings, "MONTHLY_VOICE_CAP", 1)
    body = {"analysis": {}, "treatment": {}}
    c = voice_client()
    codes = [c.post("/voice/generate", json=body, headers=KEY).status_code for _ in range(2)]
    assert codes == [200, 429] and len(called) == 1


def test_generation_switch_off_refuses_even_with_a_valid_key(monkeypatch):
    monkeypatch.setattr(settings, "GENERATION_ENABLED", False)
    r = scan_client().post("/scan/analyze", files=IMG, headers=KEY)
    assert r.status_code == 503


def test_generation_switch_defaults_to_off():
    from app.core.config import Settings
    assert Settings.model_fields["GENERATION_ENABLED"].default is False


def test_scan_never_makes_audio(monkeypatch):
    from app.api.v1 import scan as scan_mod
    assert not hasattr(scan_mod, "generate_voice")


def test_repeat_voice_request_uses_cache_and_one_provider_call(monkeypatch):
    import asyncio
    import importlib.util
    import pathlib
    from app.services import treatment as t
    path = pathlib.Path(t.__file__).with_name("voice.py")
    spec = importlib.util.spec_from_file_location("real_voice_cache_test", path)
    v = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(v)
    calls = []

    def fake(script, language):
        calls.append(language)
        return b"audio"
    monkeypatch.setattr(v, "_speak", fake)
    a = {"crop_type": "Tomato", "disease_name": "Early Blight", "urgency": "Low"}

    async def go():
        r = await asyncio.gather(*[v.generate_voice(a, {}, "English") for _ in range(3)])
        r.append(await v.generate_voice(a, {}, "English"))
        return r
    out = asyncio.run(go())
    assert out == [b"audio"] * 4 and len(calls) == 1
    assert v.cached_voice(a, "English") == b"audio" and v.cached_voice(a, "Hindi") is None
