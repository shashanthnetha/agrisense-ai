"""Run the frozen held-out set once. Ranking and abstention are reported separately.

The threshold is NOT chosen here: it is the calibration-only value from run_eval.py, passed in
(default = retrieval.DEFAULT_UNKNOWN_THRESHOLD). Verifies the file hash first.
"""
import hashlib, json, os, sys
import numpy as np
from app.services.retrieval import build_query, kb_document, DEFAULT_UNKNOWN_THRESHOLD

HERE = os.path.dirname(os.path.abspath(__file__))
raw = open(os.path.join(HERE, "heldout_v2.json"), "rb").read()
want = open(os.path.join(HERE, "heldout_v2.sha256")).read().split()[0]
assert hashlib.sha256(raw).hexdigest() == want, "held-out file changed since it was frozen"
Q = json.loads(raw)
thr = float(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_UNKNOWN_THRESHOLD

from fastembed import TextEmbedding
m = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
emb = lambda t: np.array(list(m.embed(t)))
kb = json.load(open(os.path.join(HERE, "..", "diseases.json")))
D = emb([kb_document(d) for d in kb]); crops = [d["crop"].lower() for d in kb]

def rank(q):
    s = D @ emb([build_query(q["symptoms"], q["crop"])])[0]
    c = q["crop"].lower()
    if c != "unknown":
        idx = [i for i in np.argsort(-s) if crops[i] == c]   # named crop with no entries -> empty -> abstain
    else:
        idx = list(np.argsort(-s))
    return [(int(i), float(s[i])) for i in idx[:3]]

def top(r): return r[0][1] if r else -1.0
sets = {k: [(q, rank(q)) for q in Q[k]] for k in Q if k != "note"}

print("RANKING (in-KB only, no threshold involved)")
for k in ("in_kb_confusable", "in_kb_crop_unknown"):
    rows = sets[k]
    t1 = np.mean([r and r[0][0] == q["kb_id"] for q, r in rows]); t3 = np.mean([q["kb_id"] in [x[0] for x in r] for q, r in rows])
    print(f"  {k}: n={len(rows)} top1 {t1:.2f} top3 {t3:.2f}")
bad = [(q["kb_id"], kb[r[0][0]]["name"]) for q, r in sets["in_kb_confusable"] + sets["in_kb_crop_unknown"] if r and r[0][0] != q["kb_id"]]
print("  top1 misses (true id, returned):", [(i, kb[i]["name"], n) for i, n in bad])

ins = [top(r) for k in ("in_kb_confusable", "in_kb_crop_unknown") for _, r in sets[k]]
outs = [top(r) for k in ("out_of_kb_same_crop_lookalike", "out_of_kb_wrong_or_missing_crop") for _, r in sets[k]]
auc = np.mean([[a > b or 0.5 * (a == b) for b in outs] for a in ins])
print("ABSTENTION (threshold fixed at %.3f, not tuned here)" % thr)
print(f"  AUC separating in-KB from out-of-KB by top score: {auc:.2f}")
print(f"  in-KB wrongly abstained: {np.mean([s < thr for s in ins]):.2f} (n={len(ins)})")
for k in ("out_of_kb_same_crop_lookalike", "out_of_kb_wrong_or_missing_crop"):
    sc = [top(r) for _, r in sets[k]]
    print(f"  {k}: abstained {np.mean([s < thr for s in sc]):.2f} (n={len(sc)}); scores {sorted(round(s,2) for s in sc)}")
print(f"  in-KB scores range {min(ins):.2f}..{max(ins):.2f}; out-of-KB {min(outs):.2f}..{max(outs):.2f}")
wrong_match = [(q['crop'], kb[r[0][0]]['name']) for q, r in sets['out_of_kb_same_crop_lookalike'] if r and top(r) >= thr]
print("  out-of-KB cases that would have been returned as a match:", wrong_match)
