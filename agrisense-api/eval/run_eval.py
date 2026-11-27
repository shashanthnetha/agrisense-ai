"""Offline eval for symptom-aware retrieval. No network, no Pinecone, no paid calls.

Embeds diseases.json with the production template and MiniLM model, then scores
synthetic symptom queries (eval/queries.json). The unknown threshold is chosen on the
calibration set only, then applied once to the separate test set.

Not a measure of real-world accuracy: queries are author-written, sets are small, and
nothing here uses photos or model output. See eval/queries.json for the caveat.

Usage: python eval/run_eval.py
"""
import json
import os

import numpy as np

from app.services.retrieval import (build_query, kb_document, decide, UNKNOWN, MATCH, pick_threshold)

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    from fastembed import TextEmbedding
    model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
    emb = lambda ts: np.array(list(model.embed(ts)))
    kb = json.load(open(os.path.join(HERE, "diseases.json")))
    Q = json.load(open(os.path.join(HERE, "eval", "queries.json")))
    D = emb([kb_document(d) for d in kb])
    crops = [d["crop"] for d in kb]

    def rank(q, crop):
        v = emb([build_query(q["symptoms"], crop)])[0]
        s = D @ v
        same = [i for i in np.argsort(-s) if crops[i].lower() == crop.lower()]
        order = same if same else list(np.argsort(-s))
        return [(int(i), float(s[i])) for i in order[:3]], bool(same)

    def run(split):
        rows = []
        for q in split["in_kb"]:
            top, _ = rank(q, q["crop"])
            rows.append(("in", top, q["kb_id"]))
        for q in split["out_of_kb"]:
            top, _ = rank(q, q["crop"])
            rows.append(("out", top, None))
        return rows

    cal, test = run(Q["calibration"]), run(Q["test"])

    def top1_scores(rows, kind):
        return [r[1][0][1] for r in rows if r[0] == kind]

    thr = pick_threshold(top1_scores(cal, "in"), top1_scores(cal, "out"))

    def report(name, rows, thr):
        ins = [r for r in rows if r[0] == "in"]
        outs = [r for r in rows if r[0] == "out"]
        t1 = sum(r[1][0][0] == r[2] for r in ins) / len(ins)
        t3 = sum(r[2] in [x[0] for x in r[1]] for r in ins) / len(ins)
        kept = sum(decide(r[1][0][1], thr) == MATCH for r in ins) / len(ins)
        flagged = sum(decide(r[1][0][1], thr) == UNKNOWN for r in outs) / len(outs)
        print(f"{name:12s} in-KB top1 {t1:.2f} top3 {t3:.2f} | at threshold {thr:.3f}: "
              f"in-KB kept as match {kept:.2f} ({len(ins)}), out-of-KB flagged unknown {flagged:.2f} ({len(outs)})")

    print("score ranges (same-crop top1):")
    for name, rows in (("calibration", cal), ("test", test)):
        print(f"  {name}: in-KB {min(top1_scores(rows,'in')):.2f}..{max(top1_scores(rows,'in')):.2f}  "
              f"out-of-KB {min(top1_scores(rows,'out')):.2f}..{max(top1_scores(rows,'out')):.2f}")
    print(f"threshold picked on calibration only: {thr:.3f}")
    report("calibration", cal, thr)
    report("test", test, thr)


if __name__ == "__main__":
    main()
