import asyncio
import logging
import os
from typing import List, Optional, Sequence

from app.services import retrieval
from app.services.guard import run_provider

logger = logging.getLogger(__name__)

TOP_K = 3
RAG_TIMEOUT_SECONDS = 15

# Optional minimum similarity score for a retrieved match. Off by default.
#
# It is only applied when the Pinecone index metric is cosine or dotproduct
# (higher = more similar). With the unit-length all-MiniLM-L6-v2 vectors used here
# the two give the same scores. For a euclidean index the score is a distance and
# a minimum would mean the opposite, so it is ignored. See
# scripts/eval_retrieval.py for the score distributions this default is based on.
SIMILARITY_METRICS = {"cosine", "dotproduct"}

_embedder = None
_index = None
_metric: Optional[str] = None


# Returned instead of knowledge when no entry fits. Distinct from "Error retrieving knowledge."
NO_MATCH_CONTEXT = (
    "NO MATCHING ENTRY: the knowledge base has no entry that fits these symptoms. "
    "Do not name or assume a specific disease from the knowledge base."
)


import re as _re
from datetime import date as _date

# A reference record counts as checked only when its own stored fields carry flat, schema-valid provenance
# (Pinecone metadata cannot hold nested objects). Words inside retrieved text can never make a record verified.
VERIFIABLE_FIELDS = ("organic_treatment", "prevention")
_URL_RE = _re.compile(r"^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/\S*)?$")


class RetrievedContext(str):
    """The notes sent to the model (str) plus `verified_context`: text built ONLY from records that passed
    validate_provenance, limited to the fields they verify. Plain strings carry none, so they fail closed."""

    verified_context: str = ""

    def __new__(cls, text: str, verified_context: str = ""):
        obj = super().__new__(cls, text)
        obj.verified_context = verified_context or ""
        return obj


def verified_context_of(context) -> str:
    """The verified text of a retrieval result, or "" (also for plain strings, errors and no-match)."""
    v = getattr(context, "verified_context", "")
    return v if isinstance(v, str) else ""


def validate_provenance(metadata, crop: Optional[str] = None) -> Optional[set]:
    """Return the set of fields this record verifies, or None when the provenance is missing or malformed.
    Needs: https source_url, source_title, verified_by, verified_on (YYYY-MM-DD, not in the future),
    verified_fields (a list), a name, and a crop that matches the scanned crop when one is known.
    Treatment text is usable only if 'organic_treatment' is among the verified fields."""
    if not isinstance(metadata, dict):
        return None
    for key in ("name", "crop", "source_title", "verified_by"):
        v = metadata.get(key)
        if not isinstance(v, str) or not v.strip():
            return None
    url = metadata.get("source_url")
    if not isinstance(url, str) or not _URL_RE.match(url):
        return None
    on = metadata.get("verified_on")
    try:
        if not isinstance(on, str) or not _re.fullmatch(r"\d{4}-\d{2}-\d{2}", on) or _date.fromisoformat(on) > _date.today():
            return None
    except ValueError:
        return None
    fields = metadata.get("verified_fields")
    if not isinstance(fields, list) or not all(isinstance(f, str) for f in fields):
        return None
    ok = {f for f in fields if f in VERIFIABLE_FIELDS}
    if "organic_treatment" not in ok:
        return None
    wanted = _clean_crop(crop)
    if wanted and metadata["crop"].strip().lower() != wanted.lower():
        return None
    return ok


def build_verified_context(matches: list, crop: Optional[str] = None) -> str:
    """Notes from validated records only, each limited to the fields its provenance covers."""
    out = ""
    for match in matches:
        metadata = getattr(match, "metadata", None)
        ok = validate_provenance(metadata, crop)
        if not ok:
            continue
        out += "\n--- Verified Reference ---\n"
        out += f"Name: {metadata.get('name')}\nCrop: {metadata.get('crop')}\n"
        out += f"Source: {metadata.get('source_title')} ({metadata.get('source_url')})\n"
        out += f"Organic Treatment: {metadata.get('organic_treatment')}\n"
        if "prevention" in ok:
            out += f"Prevention: {metadata.get('prevention')}\n"
    return out


def _mode() -> str:
    """RAG_MODE=symptom turns on symptom-aware retrieval. Default stays the original name lookup."""
    return "symptom" if os.getenv("RAG_MODE", "").strip().lower() == "symptom" else "legacy"


def _namespace() -> Optional[str]:
    return os.getenv("RAG_NAMESPACE", "").strip() or None


def _unknown_threshold() -> float:
    raw = os.getenv("RAG_UNKNOWN_THRESHOLD")
    try:
        return float(raw) if raw else retrieval.DEFAULT_UNKNOWN_THRESHOLD
    except ValueError:
        logger.warning("Ignoring invalid RAG_UNKNOWN_THRESHOLD")
        return retrieval.DEFAULT_UNKNOWN_THRESHOLD


def _min_score() -> Optional[float]:
    raw = os.getenv("RAG_MIN_SCORE")
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        logger.warning("Ignoring invalid RAG_MIN_SCORE")
        return None


class _Embedder:
    """all-MiniLM-L6-v2 through ONNX (fastembed): same model and 384-d unit vectors as
    sentence-transformers, without loading torch (about half the memory)."""

    def __init__(self):
        from fastembed import TextEmbedding
        self._model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")

    def encode(self, text: str):
        return next(iter(self._model.embed([text])))


def _load():
    """Create the embedder and Pinecone index on first use (not at import time)."""
    global _embedder, _index, _metric
    if _embedder is not None and _index is not None:
        return
    from pinecone import Pinecone
    from app.core.config import settings

    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    try:
        desc = pc.describe_index(settings.PINECONE_INDEX_NAME)
        # Integrated-embedding indexes report the metric under .embed
        metric = getattr(desc, "metric", None) or getattr(getattr(desc, "embed", None), "metric", None)
        _metric = str(metric).lower() if metric else None
    except Exception as e:
        logger.warning("Could not read Pinecone index metric: %s", type(e).__name__)
        _metric = None
    _embedder = _Embedder()
    _index = index


def _clean_crop(crop: Optional[str]) -> Optional[str]:
    crop = (crop or "").strip()
    if not crop or crop.lower() == "unknown":
        return None
    return crop.title()


def select_matches(matches: list, min_score: Optional[float], metric: Optional[str]) -> list:
    """Drop matches below min_score, only when the metric is a similarity."""
    if min_score is None or metric not in SIMILARITY_METRICS:
        return list(matches)
    return [m for m in matches if getattr(m, "score", None) is not None and m.score >= min_score]


def build_context(matches: list) -> str:
    context = ""
    for match in matches:
        metadata = match.metadata or {}
        score = getattr(match, "score", None)
        context += "\n--- Disease Info ---\n"
        if score is not None:
            context += f"Match score: {score:.2f}\n"
        context += f"Name: {metadata.get('name')}\n"
        context += f"Crop: {metadata.get('crop')}\n"
        context += f"Symptoms: {metadata.get('symptoms')}\n"
        # Chemical fields are deliberately left out: they have no source (see services/safety.py).
        context += f"Organic Treatment: {metadata.get('organic_treatment')}\n"
        context += f"Prevention: {metadata.get('prevention')}\n"
    return context


def _query_sync(disease: Optional[str], crop: Optional[str]) -> List:
    _load()
    query_text = f"Disease: {disease} in Crop: {crop}"
    vector = _embedder.encode(query_text).tolist()

    crop_name = _clean_crop(crop)
    matches = []
    if crop_name:
        # Prefer entries for the same crop; fall back to all crops if there are none.
        results = _index.query(
            vector=vector, top_k=TOP_K, include_metadata=True,
            filter={"crop": {"$eq": crop_name}},
        )
        matches = list(results.matches)
    if not matches:
        results = _index.query(vector=vector, top_k=TOP_K, include_metadata=True)
        matches = list(results.matches)
    return select_matches(matches, _min_score(), _metric)


def _query_symptoms_sync(symptoms: Sequence[str], crop: Optional[str]) -> List:
    """Read-only query by observed symptoms; the predicted disease name is not used."""
    _load()
    vector = _embedder.encode(retrieval.build_query(symptoms, crop)).tolist()
    kwargs = {"vector": vector, "top_k": TOP_K, "include_metadata": True}
    ns = _namespace()
    if ns:
        kwargs["namespace"] = ns
    crop_name = _clean_crop(crop)
    if crop_name:
        # A named crop with no entries means "not in the knowledge base": do not borrow another crop's entry.
        matches = list(_index.query(filter={"crop": {"$eq": crop_name}}, **kwargs).matches)
    else:
        matches = list(_index.query(**kwargs).matches)
    top = matches[0].score if matches else None
    if retrieval.decide(top, _unknown_threshold()) == retrieval.UNKNOWN:
        return []
    # Keep only entries that are themselves above the threshold.
    return [m for m in matches if m.score is not None and m.score >= _unknown_threshold()]


async def query_disease_knowledge(disease: str, crop: str, symptoms: Optional[Sequence[str]] = None):
    try:
        if _mode() == "symptom" and symptoms:
            matches = await run_provider(_query_symptoms_sync, symptoms, crop, timeout=RAG_TIMEOUT_SECONDS)
            return RetrievedContext(build_context(matches), build_verified_context(matches, crop)) if matches else NO_MATCH_CONTEXT
        # The embedding model and the Pinecone call are blocking: keep them off the event loop.
        matches = await run_provider(_query_sync, disease, crop, timeout=RAG_TIMEOUT_SECONDS)
        context = build_context(matches)
        return RetrievedContext(context, build_verified_context(matches, crop)) if context else NO_MATCH_CONTEXT
    except Exception as e:
        logger.error("Error querying Pinecone (%s): %s", type(e).__name__, e)
        return "Error retrieving knowledge."
