"""Pre-flight input-token check and usage logging for Gemini calls.

count_tokens is a free call. The check fails closed: if the count cannot be read, or it is
over the cap, the paid generate call is not made.
"""
import asyncio
import logging
import threading

logger = logging.getLogger(__name__)


class InputTooLarge(Exception):
    pass


class BudgetExceeded(Exception):
    pass


_lock = threading.Lock()
_used = {"calls": 0, "tokens": 0}
_outstanding = {"n": 0}


def reset_budget_for_tests() -> None:
    with _lock:
        _used.update(calls=0, tokens=0)
        _outstanding["n"] = 0


def _reserve(total: int, label: str) -> None:
    from app.core.config import settings
    with _lock:
        if _used["calls"] + 1 > settings.TOTAL_GEMINI_CALLS_BUDGET or _used["tokens"] + total > settings.TOTAL_INPUT_TOKENS_BUDGET:
            logger.error("%s blocked: aggregate Gemini budget used up (calls=%d tokens=%d)", label, _used["calls"], _used["tokens"])
            raise BudgetExceeded(f"{label} blocked by aggregate budget")
        _used["calls"] += 1
        _used["tokens"] += total


def check_input_tokens(model, contents, cap: int, label: str) -> int:
    total = int(model.count_tokens(contents).total_tokens)
    if total > cap:
        logger.error("%s input is %d tokens, over the cap of %d; not calling the model", label, total, cap)
        raise InputTooLarge(f"{label} input too large")
    _reserve(total, label)
    logger.info("%s input tokens: %d (cap %d)", label, total, cap)
    return total


def log_usage(response, label: str) -> None:
    meta = getattr(response, "usage_metadata", None)
    if meta is not None:
        logger.info(
            "%s usage: input=%s output=%s",
            label, getattr(meta, "prompt_token_count", "?"), getattr(meta, "candidates_token_count", "?"),
        )


class ProviderBusy(Exception):
    """Too many provider calls are still running in worker threads."""



def outstanding_provider_calls() -> int:
    with _lock:
        return _outstanding["n"]


async def run_provider(fn, *args, timeout: float):
    """Run a blocking provider call in a worker thread, bounded in two ways.

    1. The caller stops waiting after `timeout` seconds.
    2. The call is counted as outstanding until the THREAD returns, not until the caller gives up.
       A timed-out call that is still running keeps its slot, so repeated timeouts cannot pile up
       threads or open extra provider calls beyond MAX_OUTSTANDING_PROVIDER_CALLS.
    Raises ProviderBusy at once when the cap is reached, before any provider call is made.
    """
    from app.core.config import settings
    with _lock:
        if _outstanding["n"] >= settings.MAX_OUTSTANDING_PROVIDER_CALLS:
            raise ProviderBusy("too many provider calls still running")
        _outstanding["n"] += 1

    def _run():
        try:
            return fn(*args)
        finally:
            with _lock:
                _outstanding["n"] -= 1

    loop = asyncio.get_running_loop()
    fut = loop.run_in_executor(None, _run)
    # Shield: when the caller times out or is cancelled the thread is NOT cancelled, so _run always
    # runs to its finally and the slot is always given back (a cancelled-before-start future would leak it).
    fut.add_done_callback(lambda f: f.cancelled() or f.exception())
    return await asyncio.wait_for(asyncio.shield(fut), timeout=timeout)
