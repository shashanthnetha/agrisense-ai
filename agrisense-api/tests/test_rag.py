import asyncio
from types import SimpleNamespace as NS

import pytest

from app.services import rag


def match(name, crop, score):
    return NS(score=score, metadata={"name": name, "crop": crop, "symptoms": "s",
                                     "organic_treatment": "o", "chemical_treatment": "c", "prevention": "p"})


class FakeEmbedder:
    def encode(self, text):
        FakeEmbedder.last = text
        return NS(tolist=lambda: [0.1, 0.2])


class FakeIndex:
    """Returns crop-filtered results only when a filter is passed."""
    def __init__(self, filtered, unfiltered):
        self.filtered, self.unfiltered, self.calls = filtered, unfiltered, []

    def query(self, **kw):
        self.calls.append(kw)
        return NS(matches=self.filtered if "filter" in kw else self.unfiltered)


@pytest.fixture
def wired(monkeypatch):
    def _wire(filtered, unfiltered, metric="cosine"):
        idx = FakeIndex(filtered, unfiltered)
        monkeypatch.setattr(rag, "_embedder", FakeEmbedder())
        monkeypatch.setattr(rag, "_index", idx)
        monkeypatch.setattr(rag, "_metric", metric)
        monkeypatch.delenv("RAG_MIN_SCORE", raising=False)
        return idx
    return _wire


def run(coro):
    return asyncio.run(coro)


def test_crop_filter_used_and_query_text_unchanged(wired):
    idx = wired([match("Rice Blast", "Rice", 0.8)], [match("Other", "Wheat", 0.5)])
    out = run(rag.query_disease_knowledge("Rice Blast", "rice"))
    assert idx.calls[0]["filter"] == {"crop": {"$eq": "Rice"}}
    assert len(idx.calls) == 1 and "Rice Blast" in out and "Other" not in out
    assert FakeEmbedder.last == "Disease: Rice Blast in Crop: rice"


def test_falls_back_to_all_crops_when_filter_finds_nothing(wired):
    idx = wired([], [match("Wheat Rust", "Wheat", 0.6)])
    out = run(rag.query_disease_knowledge("Rust", "Barley"))
    assert len(idx.calls) == 2 and "filter" not in idx.calls[1] and "Wheat Rust" in out


@pytest.mark.parametrize("crop", ["Unknown", "", None])
def test_unknown_crop_skips_filter(wired, crop):
    idx = wired([], [match("X", "Y", 0.6)])
    run(rag.query_disease_knowledge("X", crop))
    assert len(idx.calls) == 1 and "filter" not in idx.calls[0]


def test_scores_are_shown_in_context(wired):
    wired([match("Rice Blast", "Rice", 0.8123)], [])
    assert "Match score: 0.81" in run(rag.query_disease_knowledge("Rice Blast", "Rice"))


def test_min_score_applies_for_cosine(wired, monkeypatch):
    wired([match("Good", "Rice", 0.8), match("Weak", "Rice", 0.4)], [])
    monkeypatch.setenv("RAG_MIN_SCORE", "0.6")
    out = run(rag.query_disease_knowledge("x", "Rice"))
    assert "Good" in out and "Weak" not in out


def test_min_score_ignored_for_euclidean(wired, monkeypatch):
    wired([match("A", "Rice", 0.4)], [], metric="euclidean")
    monkeypatch.setenv("RAG_MIN_SCORE", "0.6")
    assert "Name: A" in run(rag.query_disease_knowledge("x", "Rice"))


def test_min_score_ignored_when_metric_unknown(wired, monkeypatch):
    wired([match("A", "Rice", 0.4)], [], metric=None)
    monkeypatch.setenv("RAG_MIN_SCORE", "0.6")
    assert "Name: A" in run(rag.query_disease_knowledge("x", "Rice"))


def test_everything_filtered_out_abstains_with_no_match(wired, monkeypatch):
    wired([match("Weak", "Rice", 0.3)], [])
    monkeypatch.setenv("RAG_MIN_SCORE", "0.6")
    assert run(rag.query_disease_knowledge("x", "Rice")) == rag.NO_MATCH_CONTEXT


def test_empty_result_abstains_with_no_match(wired):
    wired([], [])
    assert run(rag.query_disease_knowledge("x", "Rice")) == rag.NO_MATCH_CONTEXT


def test_invalid_min_score_is_ignored(wired, monkeypatch):
    wired([match("A", "Rice", 0.1)], [])
    monkeypatch.setenv("RAG_MIN_SCORE", "abc")
    assert "Name: A" in run(rag.query_disease_knowledge("x", "Rice"))


def test_backend_error_returns_error_text(monkeypatch):
    class Boom:
        def query(self, **kw): raise RuntimeError("secret")
    monkeypatch.setattr(rag, "_embedder", FakeEmbedder())
    monkeypatch.setattr(rag, "_index", Boom())
    assert run(rag.query_disease_knowledge("x", "Rice")) == "Error retrieving knowledge."
