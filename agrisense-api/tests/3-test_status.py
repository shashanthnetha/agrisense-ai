from datetime import datetime, timedelta, timezone

from app.core.config import settings
from tests.test_limits import scan_client

FUTURE = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
PAST = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()


def public_window(monkeypatch, until=FUTURE, voice=False):
    monkeypatch.setattr(settings, "PUBLIC_MODE", True)
    monkeypatch.setattr(settings, "PUBLIC_UNTIL", until)
    monkeypatch.setattr(settings, "SCAN_TOTAL_CAP", 25)
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql://x")
    monkeypatch.setattr(settings, "PUBLIC_VOICE_ENABLED", voice)


def test_status_paused_when_generation_disabled(monkeypatch):
    monkeypatch.setattr(settings, "GENERATION_ENABLED", False)
    r = scan_client().get("/scan/status")
    assert r.status_code == 200
    assert r.json() == {"open": False, "voice_available": False, "access_key_accepted": False, "state": "paused"}


def test_status_open_during_public_window_and_voice_follows_flag(monkeypatch):
    public_window(monkeypatch, voice=False)
    body = scan_client().get("/scan/status").json()
    assert body == {"open": True, "voice_available": False, "access_key_accepted": False, "state": "open"}

    public_window(monkeypatch, voice=True)
    body = scan_client().get("/scan/status").json()
    assert body["open"] is True and body["voice_available"] is True and body["state"] == "open"


def test_status_closed_after_public_window_expires(monkeypatch):
    public_window(monkeypatch, until=PAST)
    body = scan_client().get("/scan/status").json()
    assert body == {"open": False, "voice_available": False, "access_key_accepted": False, "state": "closed"}


def test_status_closed_when_public_window_misconfigured(monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_MODE", True)
    monkeypatch.setattr(settings, "PUBLIC_UNTIL", None)
    monkeypatch.setattr(settings, "SCAN_TOTAL_CAP", 25)
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql://x")
    body = scan_client().get("/scan/status").json()
    assert body["open"] is False and body["state"] == "closed"


def test_status_key_required_when_closed_with_access_key(monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_MODE", False)
    monkeypatch.setattr(settings, "ACCESS_KEY", "test-access-key")
    body = scan_client().get("/scan/status").json()
    assert body == {"open": True, "voice_available": True, "access_key_accepted": True, "state": "key_required"}


def test_status_paused_when_closed_without_access_key(monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_MODE", False)
    monkeypatch.setattr(settings, "ACCESS_KEY", None)
    body = scan_client().get("/scan/status").json()
    assert body == {"open": False, "voice_available": False, "access_key_accepted": False, "state": "paused"}


def test_status_response_contains_no_secrets_or_counters(monkeypatch):
    public_window(monkeypatch)
    body = scan_client().get("/scan/status").json()
    assert set(body.keys()) == {"open", "voice_available", "access_key_accepted", "state"}
