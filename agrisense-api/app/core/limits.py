"""Simple in-memory usage limits for endpoints that spend paid or quota-limited API calls.

Counters live in this process only: they reset when the service restarts or sleeps.
They are a safety net against runaway use, not billing-grade metering. The providers'
own quotas remain the hard stop.
"""
import hmac
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from app.core.config import settings

_lock = threading.Lock()
_ip_hits = defaultdict(deque)  # ip -> timestamps of recent scans
_day = {"key": None, "count": 0}
_month = {"key": None, "count": 0}


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _this_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def require_access(request: Request) -> None:
    """Closed by default: paid endpoints work only when ACCESS_KEY is set and the caller sends it.

    The key is compared in constant time. With no ACCESS_KEY configured every call is refused.
    """
    expected = settings.ACCESS_KEY
    if not expected:
        raise HTTPException(status_code=503, detail="Scanning is not open right now.")
    given = request.headers.get("x-access-key", "")
    if not hmac.compare_digest(given.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="A valid access key is needed to scan.")


def check_scan_allowed(request: Request) -> None:
    """Raise 429 when this IP or the whole service has used up its scan allowance."""
    ip = client_ip(request)
    now = time.time()
    with _lock:
        if _day["key"] != _today():
            _day.update(key=_today(), count=0)
        if _day["count"] >= settings.DAILY_SCAN_CAP:
            raise HTTPException(
                status_code=429,
                detail="The daily scan limit has been reached. Please try again tomorrow.",
            )
        hits = _ip_hits[ip]
        while hits and now - hits[0] > 3600:
            hits.popleft()
        if len(hits) >= settings.SCANS_PER_IP_PER_HOUR:
            raise HTTPException(
                status_code=429,
                detail="Too many scans from your connection. Please wait a while and try again.",
            )
        hits.append(now)
        _day["count"] += 1


def voice_allowed() -> bool:
    """True while this month's voice-report allowance is not used up. Counts the call."""
    with _lock:
        if _month["key"] != _this_month():
            _month.update(key=_this_month(), count=0)
        if _month["count"] >= settings.MONTHLY_VOICE_CAP:
            return False
        _month["count"] += 1
        return True


def reset_for_tests() -> None:
    with _lock:
        _ip_hits.clear()
        _day.update(key=None, count=0)
        _month.update(key=None, count=0)
