import asyncio
from types import SimpleNamespace as NS

import pytest

from app.services import rag, retrieval
from tests.test_rag import FakeEmbedder, FakeIndex, match


def run(c):
    return asyncio.run(c)


def test_query_uses_symptoms_not_the_predicted_name():
    q = retrieval.build_query(["grey spots", " ", "yellow halo"], "Rice")
    assert "grey spots" in q and "yellow halo" in q and "Rice" in q
    assert "Blast" not in q


def test_query_is_bounded_and_ignores_non_strings():
    q = retrieval.build_query(["x" * 1000, 5, None] + ["a"] * 20, "unknown")
    assert len(q) < 8 * (retrieval.MAX_SYMPTOM_CHARS + 2) + 60 and "Crop:" not in q


def test_decide_and_threshold():
    assert retrieval.decide(None, 0.7) == retrieval.UNKNOWN
    assert retrieval.decide(0.69, 0.7) == retrieval.UNKNOWN
    assert retrieval.decide(0.7, 0.7) == retrieval.MATCH
    t = retrieval.pick_threshold([0.9, 0.85, 0.8], [0.6, 0.65, 0.7])
    assert 0.7 < t <= 0.8
    assert retrieval.pick_threshold([], [0.5]) == retrieval.DEFAULT_UNKNOWN_THRESHOLD


def test_namespace_guard_fails_closed():
    retrieval.assert_namespace_is_new({"": {}}, "v2")
    with pytest.raises(retrieval.NamespaceExists):
        retrieval.assert_namespace_is_new({"v2": {"vector_count": 3}}, "v2")


@pytest.fixture
def wired(monkeypatch):
    def _w(filtered, unfiltered):
        idx = FakeIndex(filtered, unfiltered)
        monkeypatch.setattr(rag, "_embedder", FakeEmbedder())
        monkeypatch.setattr(rag, "_index", idx)
        monkeypatch.setattr(rag, "_metric", "cosine")
        monkeypatch.setenv("RAG_MODE", "symptom")
        monkeypatch.setenv("RAG_UNKNOWN_THRESHOLD", "0.8")
        monkeypatch.delenv("RAG_NAMESPACE", raising=False)
        return idx
    return _w


def test_default_mode_is_legacy_name_lookup(wired, monkeypatch):
    idx = wired([match("Rice Blast", "Rice", 0.5)], [])
    monkeypatch.delenv("RAG_MODE")
    out = run(rag.query_disease_knowledge("Rice Blast", "Rice", symptoms=["spots"]))
    assert "Disease: Rice Blast" in FakeEmbedder.last and "Rice Blast" in out


def test_symptom_mode_match_above_threshold(wired):
    wired([match("Rice Blast", "Rice", 0.9), match("Weak", "Rice", 0.7)], [])
    out = run(rag.query_disease_knowledge("Anything", "Rice", symptoms=["grey spots"]))
    assert "Name: Rice Blast" in out and "Weak" not in out
    assert "Anything" not in FakeEmbedder.last


def test_symptom_mode_below_threshold_is_no_match_not_the_nearest(wired):
    wired([match("Rice Blast", "Rice", 0.6)], [])
    assert run(rag.query_disease_knowledge("x", "Rice", symptoms=["odd"])) == rag.NO_MATCH_CONTEXT


def test_symptom_mode_unknown_crop_does_not_borrow_another_crop(wired):
    idx = wired([], [match("Rice Blast", "Rice", 0.99)])
    assert run(rag.query_disease_knowledge("x", "Sorghum", symptoms=["odd"])) == rag.NO_MATCH_CONTEXT
    assert len(idx.calls) == 1 and "filter" in idx.calls[0]


def test_namespace_is_read_from_env(wired, monkeypatch):
    idx = wired([match("A", "Rice", 0.9)], [])
    monkeypatch.setenv("RAG_NAMESPACE", "v2")
    run(rag.query_disease_knowledge("x", "Rice", symptoms=["s"]))
    assert idx.calls[0]["namespace"] == "v2"


def test_retrieval_error_is_not_reported_as_no_match(wired, monkeypatch):
    class Boom:
        def query(self, **kw):
            raise RuntimeError("down")
    wired([], [])
    monkeypatch.setattr(rag, "_index", Boom())
    assert run(rag.query_disease_knowledge("x", "Rice", symptoms=["s"])) == "Error retrieving knowledge."


def test_scan_no_match_gives_no_treatment_and_no_voice(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.v1 import scan
    from tests.test_scan_failures import GOOD, post

    async def rag(**kw):
        return rag_mod.NO_MATCH_CONTEXT
    rag_mod = rag_module = __import__("app.services.rag", fromlist=["x"])
    monkeypatch.setattr(scan, "query_disease_knowledge", rag)
    async def an(_):
        return dict(GOOD)
    monkeypatch.setattr(scan, "analyze_image", an)
    called = []
    async def tr(*a, **k):
        called.append(1)
    monkeypatch.setattr(scan, "generate_treatment", tr)
    app = FastAPI(); app.include_router(scan.router, prefix="/scan")
    r = post(TestClient(app))
    j = r.json()
    assert r.status_code == 200 and not called
    assert j["treatment"] is None and j["voice_data"] is None and j["knowledge_match"] == "none"
    assert j["analysis"]["disease_name"] == "Leaf Blight" and "agriculture officer" in j["treatment_message"]
