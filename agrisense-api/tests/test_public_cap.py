import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.api.v1 import scan
from app.core import cap
from app.core.config import settings
from tests.test_limits import IMG, scan_client, voice_client

FUTURE = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
PAST = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()


def public(monkeypatch, until=FUTURE, cap_n=25, db="postgresql://x", voice=False):
    monkeypatch.setattr(settings, "PUBLIC_MODE", True)
    monkeypatch.setattr(settings, "PUBLIC_UNTIL", until)
    monkeypatch.setattr(settings, "SCAN_TOTAL_CAP", cap_n)
    monkeypatch.setattr(settings, "DATABASE_URL", db)
    monkeypatch.setattr(settings, "PUBLIC_VOICE_ENABLED", voice)


def test_public_mode_is_off_by_default():
    assert settings.model_fields["PUBLIC_MODE"].default is False
    assert settings.model_fields["PUBLIC_VOICE_ENABLED"].default is False


@pytest.mark.parametrize("kw", [
    {"until": None}, {"until": "not a date"}, {"until": "2026-11-27T23:59:00"},  # no timezone
    {"until": PAST}, {"cap_n": 0}, {"db": None},
])
def test_bad_or_expired_window_refuses_before_any_work(monkeypatch, kw):
    public(monkeypatch, **kw)
    called = []

    async def spy(*a, **k):
        called.append(1)
    monkeypatch.setattr(scan, "analyze_image", spy)
    r = scan_client().post("/scan/analyze", files=IMG)  # no access key
    assert r.status_code == 503 and called == []


def test_generation_switch_still_wins_in_public_mode(monkeypatch):
    public(monkeypatch)
    monkeypatch.setattr(settings, "GENERATION_ENABLED", False)
    assert scan_client().post("/scan/analyze", files=IMG).status_code == 503


def test_reservation_happens_before_the_provider_call(monkeypatch):
    public(monkeypatch)
    order = []

    async def reserve():
        order.append("reserve")
        return 1

    async def detect(_):
        order.append("detect")
        return {"is_plant": False}
    monkeypatch.setattr(cap, "reserve_scan", reserve)
    monkeypatch.setattr(scan, "analyze_image", detect)
    r = scan_client().post("/scan/analyze", files=IMG)
    assert r.status_code == 200 and order == ["reserve", "detect"]


def test_unreachable_store_fails_closed_without_provider_call(monkeypatch):
    public(monkeypatch, db="postgresql://nobody@127.0.0.1:1/none")
    called = []

    async def spy(*a, **k):
        called.append(1)
    monkeypatch.setattr(scan, "analyze_image", spy)
    r = scan_client().post("/scan/analyze", files=IMG)
    assert r.status_code == 503 and called == []


def test_exhausted_allowance_refuses_without_provider_call(monkeypatch):
    public(monkeypatch)

    async def full():
        raise HTTPException(status_code=503, detail="The demo scan allowance has been used up.")
    monkeypatch.setattr(cap, "reserve_scan", full)
    called = []

    async def spy(*a, **k):
        called.append(1)
    monkeypatch.setattr(scan, "analyze_image", spy)
    r = scan_client().post("/scan/analyze", files=IMG)
    assert r.status_code == 503 and "used up" in r.text and called == []


def test_public_audio_is_off_unless_enabled(monkeypatch):
    public(monkeypatch)
    from app.api import v1  # noqa: F401
    from app.api.v1 import voice
    called = []

    async def spy(*a, **k):
        called.append(1)
        return b"x"
    monkeypatch.setattr(voice, "generate_voice", spy)
    body = {"analysis": {}, "treatment": {}}
    assert voice_client().post("/voice/generate", json=body).status_code == 503 and called == []
    monkeypatch.setattr(settings, "PUBLIC_VOICE_ENABLED", True)
    assert voice_client().post("/voice/generate", json=body).status_code == 200


def test_real_postgres_allows_exactly_the_cap_under_concurrency(monkeypatch):
    pgserver = pytest.importorskip("pgserver")
    pytest.importorskip("asyncpg")
    import tempfile
    d = tempfile.mkdtemp()
    srv = pgserver.get_server(d, cleanup_mode="stop")
    try:
        public(monkeypatch, cap_n=25, db=srv.get_uri())

        async def go():
            return await asyncio.gather(*[cap.reserve_scan() for _ in range(40)], return_exceptions=True)
        res = asyncio.run(go())
        ok = [r for r in res if isinstance(r, int)]
        refused = [r for r in res if isinstance(r, HTTPException)]
        assert len(ok) == 25 and sorted(ok) == list(range(1, 26)) and len(refused) == 15
        # A fresh process (new connection) sees the same count: it is durable.
        with pytest.raises(HTTPException):
            asyncio.run(cap.reserve_scan())
        # A different window starts at zero.
        monkeypatch.setattr(settings, "PUBLIC_UNTIL", (datetime.now(timezone.utc) + timedelta(hours=9)).isoformat())
        assert asyncio.run(cap.reserve_scan()) == 1
    finally:
        srv.cleanup()
