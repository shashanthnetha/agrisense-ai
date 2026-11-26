"""Pre-flight input-token check and usage logging for Gemini calls.

count_tokens is a free call. The check fails closed: if the count cannot be read, or it is
over the cap, the paid generate call is not made.
"""
import logging

logger = logging.getLogger(__name__)


class InputTooLarge(Exception):
    pass


def check_input_tokens(model, contents, cap: int, label: str) -> int:
    total = int(model.count_tokens(contents).total_tokens)
    if total > cap:
        logger.error("%s input is %d tokens, over the cap of %d; not calling the model", label, total, cap)
        raise InputTooLarge(f"{label} input too large")
    logger.info("%s input tokens: %d (cap %d)", label, total, cap)
    return total


def log_usage(response, label: str) -> None:
    meta = getattr(response, "usage_metadata", None)
    if meta is not None:
        logger.info(
            "%s usage: input=%s output=%s",
            label, getattr(meta, "prompt_token_count", "?"), getattr(meta, "candidates_token_count", "?"),
        )
