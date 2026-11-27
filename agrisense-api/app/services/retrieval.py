"""Pure helpers for symptom-aware retrieval (no network, easy to test).

Why: the original lookup embeds the model's predicted disease NAME. If the model names
the wrong disease, retrieval fetches the wrong entry with a confident-looking score.
Here the query is built from the symptoms the model saw, and a nearest entry only counts
as a match when its similarity clears a threshold that was calibrated on data kept
separate from the test data (eval/run_eval.py).

A retrieval score is a text similarity, not a diagnostic confidence. UNKNOWN means "no
entry in the knowledge base fits", which is a different outcome from the model's own
"not a plant" or "uncertain" answers.
"""
from typing import List, Optional, Sequence

MATCH = "match"
UNKNOWN = "unknown"

# Minimum similarity for a nearest entry to count as a match. Calibrated by
# eval/run_eval.py on the calibration set; override with RAG_UNKNOWN_THRESHOLD.
DEFAULT_UNKNOWN_THRESHOLD = 0.78

MAX_SYMPTOMS = 8
MAX_SYMPTOM_CHARS = 160


def kb_document(d: dict) -> str:
    """The text that is embedded for a knowledge-base record. Must match the seed script."""
    return f"Disease: {d['name']} Crop: {d['crop']} Symptoms: {d['symptoms']}"


def build_query(symptoms: Sequence[str], crop: Optional[str]) -> str:
    """Query text from observed symptoms. The predicted disease name is deliberately left out."""
    cleaned: List[str] = []
    for s in symptoms or []:
        if isinstance(s, str) and s.strip():
            cleaned.append(s.strip()[:MAX_SYMPTOM_CHARS])
        if len(cleaned) >= MAX_SYMPTOMS:
            break
    crop = (crop or "").strip()
    crop_part = f" Crop: {crop}" if crop and crop.lower() != "unknown" else ""
    return f"Disease: unknown{crop_part} Symptoms: {'. '.join(cleaned)}"


def decide(top_score: Optional[float], threshold: float) -> str:
    if top_score is None or top_score < threshold:
        return UNKNOWN
    return MATCH


def pick_threshold(in_scores: Sequence[float], out_scores: Sequence[float]) -> float:
    """Threshold that maximises balanced accuracy on the calibration scores.

    Candidates are midpoints between neighbouring scores. Ties go to the higher threshold,
    because wrongly calling something a known disease costs more than asking the user to
    see an expert.
    """
    pts = sorted(set(list(in_scores) + list(out_scores)))
    if len(pts) < 2 or not in_scores or not out_scores:
        return DEFAULT_UNKNOWN_THRESHOLD
    best, best_t = -1.0, DEFAULT_UNKNOWN_THRESHOLD
    for a, b in zip(pts, pts[1:]):
        t = (a + b) / 2
        tpr = sum(s >= t for s in in_scores) / len(in_scores)
        tnr = sum(s < t for s in out_scores) / len(out_scores)
        bal = (tpr + tnr) / 2
        if bal >= best:
            best, best_t = bal, t
    return best_t


class NamespaceExists(Exception):
    pass


def assert_namespace_is_new(index_stats_namespaces: dict, namespace: str) -> None:
    """Fail closed: a seed/import must never write into a namespace that already has data."""
    if namespace in (index_stats_namespaces or {}):
        raise NamespaceExists(f"namespace {namespace!r} already exists; refusing to write")
