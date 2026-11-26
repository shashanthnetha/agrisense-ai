"""Pre-flight input-token check and usage logging for Gemini calls.

count_tokens is a free call. The check fails closed: if the count cannot be read, or it is
over the cap, the paid generate call is not made.
"""
import logging
import threading

logger = logging.getLogger(__name__)


class InputTooLarge(Exception):
    pass


class BudgetExceeded(Exception):
    pass


_lock = threading.Lock()
_used = {"calls": 0, "tokens": 0}


def reset_budget_for_tests() -> None:
    with _lock:
        _used.update(calls=0, tokens=0)


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
