# Retrieval evaluation results

Produced by `python scripts/eval_retrieval.py` (offline, no Pinecone or API keys; needs `sentence-transformers`).
Run on 2026-11-26 with sentence-transformers / numpy versions: 6.3.0 2.2.6. The model is all-MiniLM-L6-v2 and the knowledge base is `diseases.json` (50 diseases), embedded the way `seed_diseases.py` does it. Scores are cosine similarity, which equals the dot product for these unit-length vectors.

## Output

```
KB size: 50 diseases; k=3

exact name         crop_filter=False  top1=1.00  recall@3=1.00  top1 score min/median=0.73/0.84
exact name         crop_filter=True   top1=1.00  recall@3=1.00  top1 score min/median=0.73/0.84
lower-case         crop_filter=False  top1=1.00  recall@3=1.00  top1 score min/median=0.73/0.84
lower-case         crop_filter=True   top1=1.00  recall@3=1.00  top1 score min/median=0.73/0.84
scientific name    crop_filter=False  top1=0.72  recall@3=1.00  top1 score min/median=0.47/0.58
scientific name    crop_filter=True   top1=0.76  recall@3=1.00  top1 score min/median=0.47/0.58
name + 'disease'   crop_filter=False  top1=1.00  recall@3=1.00  top1 score min/median=0.72/0.84
name + 'disease'   crop_filter=True   top1=1.00  recall@3=1.00  top1 score min/median=0.72/0.84

out-of-KB Iron deficiency / Spinach: best=Soybean Rust (0.43)
out-of-KB Frost damage / Strawberry: best=Mango Malformation (0.50)
out-of-KB Herbicide drift / Lettuce: best=Wheat Loose Smut (0.41)
out-of-KB Sunscald / Pumpkin: best=Sunflower Downy Mildew (0.55)
out-of-KB Nitrogen deficiency / Barley: best=Wheat Rust (0.58)
out-of-KB Hail damage / Carrot: best=Citrus Greening (HLB) (0.48)
out-of-KB Salt stress / Radish: best=Chillies Anthracnose (Fruit Rot) (0.46)
out-of-KB Zinc deficiency / Sorghum: best=Wheat Rust (0.50)

in-KB exact-query top1 score: min=0.73 median=0.84
out-of-KB top1 score: min=0.41 max=0.58
overlap (largest out-of-KB >= smallest in-KB)? False
```

## Caveats

- The real Pinecone index metric is not recorded in this repo. These scores apply to a cosine or dotproduct index, not a euclidean one.
- The in-knowledge-base queries are built from `diseases.json` itself, so exact-name results (100%) are an easy case: the name is part of the indexed text. They do not show how well real Gemini output will retrieve.
- The 8 out-of-knowledge-base queries are hand-written. Together this is not a calibration set. The score floor (`RAG_MIN_SCORE`) is therefore off by default.
- Unknown-disease scores (0.41 to 0.58) overlap with scientific-name queries for known diseases (min 0.47, median 0.58), so any floor in that range would reject some valid queries.
- Scores can differ slightly by library version and hardware. Re-run the script to reproduce.
