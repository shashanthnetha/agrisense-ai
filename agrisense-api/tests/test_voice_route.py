from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import voice

H = {"X-Access-Key": "test-access-key"}
BODY = {"analysis": {}, "treatment": {}, "language": "Hindi"}


def client():
    app = FastAPI()
    app.include_router(voice.router, prefix="/voice")
    return TestClient(app)


def test_voice_success_returns_base64(monkeypatch):
    async def ok(*a, **k): return b"abc"
    monkeypatch.setattr(voice, "generate_voice", ok)
    r = client().post("/voice/generate", json=BODY, headers=H)
    assert r.status_code == 200 and r.json()["voice_data"] == "YWJj"


def test_voice_failure_does_not_leak_exception_text(monkeypatch):
    async def boom(*a, **k): raise RuntimeError("SECRET-INTERNAL-DETAIL")
    monkeypatch.setattr(voice, "generate_voice", boom)
    r = client().post("/voice/generate", json=BODY, headers=H)
    assert r.status_code == 500 and "SECRET" not in r.text


def test_voice_empty_audio_is_error(monkeypatch):
    async def none(*a, **k): return None
    monkeypatch.setattr(voice, "generate_voice", none)
    assert client().post("/voice/generate", json=BODY, headers=H).status_code == 500
