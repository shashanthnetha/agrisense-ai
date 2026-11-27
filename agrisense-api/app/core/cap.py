"""Durable total-scan allowance for the temporary public demo.

One row per demo window in Postgres. A scan takes a slot with a single atomic UPDATE before any
paid provider call, and the slot is never given back, so failures and retries cannot get past the
allowance. Anything unexpected (no database, bad settings, timeout) refuses the scan.
"""
import logging
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)

CONNECT_TIMEOUT_SECONDS = 5
_LOCK_ID = 7260125


def _until():
    raw = (settings.PUBLIC_UNTIL or "").strip()
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else None


def check_window() -> None:
    """Refuse unless the public window is fully and correctly configured and still open."""
    until = _until()
    if (
        until is None
        or settings.SCAN_TOTAL_CAP <= 0
        or not settings.DATABASE_URL
    ):
        raise HTTPException(status_code=503, detail="Scanning is not open right now.")
    if datetime.now(timezone.utc) >= until:
        raise HTTPException(status_code=503, detail="This demo has closed.")


async def reserve_scan() -> int:
    """Take one slot. Returns how many are used after this one. Raises 503 when none are left."""
    check_window()
    try:
        import asyncpg

        conn = await asyncpg.connect(settings.DATABASE_URL, timeout=CONNECT_TIMEOUT_SECONDS)
        try:
            async with conn.transaction():
                await conn.execute("SELECT pg_advisory_xact_lock($1)", _LOCK_ID)
                await conn.execute(
                    "CREATE TABLE IF NOT EXISTS public_scan_cap "
                    "(window_key text PRIMARY KEY, used integer NOT NULL DEFAULT 0)"
                )
                await conn.execute(
                    "INSERT INTO public_scan_cap (window_key, used) VALUES ($1, 0) ON CONFLICT DO NOTHING",
                    settings.PUBLIC_UNTIL,
                )
                used = await conn.fetchval(
                    "UPDATE public_scan_cap SET used = used + 1 "
                    "WHERE window_key = $1 AND used < $2 RETURNING used",
                    settings.PUBLIC_UNTIL,
                    settings.SCAN_TOTAL_CAP,
                )
        finally:
            await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Scan allowance store unavailable: %s", type(e).__name__)
        raise HTTPException(status_code=503, detail="Scanning is paused right now. Please try again later.")
    if used is None:
        raise HTTPException(status_code=503, detail="The demo scan allowance has been used up.")
    return used
