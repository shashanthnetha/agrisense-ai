"""Offline retrieval check for the AgriSense knowledge base.

Embeds diseases.json the same way seed_diseases.py does (all-MiniLM-L6-v2,
"Disease: {name} Crop: {crop} Symptoms: {symptoms}") and scores queries in
memory. Needs sentence-transformers but no Pinecone or API keys.

Embeddings are unit length, so cosine similarity equals the dot product. The
real index metric is not recorded in this repo (the index is created by hand in
the Pinecone dashboard), so these scores match a cosine or dotproduct index and
do NOT match a euclidean one.

PROVENANCE: the live agrisense-diseases index stores MiniLM vectors of exactly this
text (checked for disease_0 and disease_22: cosine 1.0 against all-MiniLM-L6-v2). The
index also has a llama-text-embed-v2 integration configured, but querying it by text
searches a different embedding space and returns wrong matches. Always query with a
MiniLM vector (rag.py does, through fastembed ONNX), never with Pinecone text search.

Usage: python scripts/eval_retrieval.py
"""
import json
import os
import statistics

import numpy as np
from sentence_transformers import SentenceTransformer

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = 3

# Diseases that are not in diseases.json, used as "should not match well" queries.
OUT_OF_KB = [
    ("Iron deficiency", "Spinach"),
    ("Frost damage", "Strawberry"),
    ("Herbicide drift", "Lettuce"),
    ("Sunscald", "Pumpkin"),
    ("Nitrogen deficiency", "Barley"),
    ("Hail damage", "Carrot"),
    ("Salt stress", "Radish"),
    ("Zinc deficiency", "Sorghum"),
]


def load():
    with open(os.path.join(HERE, "diseases.json")) as f:
        return json.load(f)


def main():
    kb = load()
    model = SentenceTransformer("all-MiniLM-L6-v2")
    docs = [f"Disease: {d['name']} Crop: {d['crop']} Symptoms: {d['symptoms']}" for d in kb]
    D = model.encode(docs, normalize_embeddings=True)
    names = {d["name"].lower() for d in kb}
    for dis, crop in OUT_OF_KB:
        assert dis.lower() not in names and f"{crop} {dis}".lower() not in names

    def search(disease, crop, crop_filter):
        q = model.encode(f"Disease: {disease} in Crop: {crop}", normalize_embeddings=True)
        scores = D @ q
        order = np.argsort(-scores)
        if crop_filter:
            keep = [i for i in order if kb[i]["crop"].lower() == crop.lower()]
            order = keep if keep else order  # fall back when the crop is unknown
        return [(int(i), float(scores[i])) for i in order[:K]]

    variants = {
        "exact name": lambda d: (d["name"], d["crop"]),
        "lower-case": lambda d: (d["name"].lower(), d["crop"].lower()),
        "scientific name": lambda d: (d["scientific_name"], d["crop"]),
        "name + 'disease'": lambda d: (d["name"] + " disease", d["crop"]),
    }
    print(f"KB size: {len(kb)} diseases; k={K}\n")
    in_kb_top1 = []
    for label, make in variants.items():
        for crop_filter in (False, True):
            hit1 = hit3 = 0
            top1 = []
            for i, d in enumerate(kb):
                dis, crop = make(d)
                res = search(dis, crop, crop_filter)
                ids = [r[0] for r in res]
                hit1 += ids[0] == i
                hit3 += i in ids
                top1.append(res[0][1])
            n = len(kb)
            print(f"{label:18s} crop_filter={str(crop_filter):5s}  top1={hit1/n:.2f}  recall@{K}={hit3/n:.2f}  "
                  f"top1 score min/median={min(top1):.2f}/{statistics.median(top1):.2f}")
            if label == "exact name" and not crop_filter:
                in_kb_top1 = top1
    print()
    neg = []
    for dis, crop in OUT_OF_KB:
        res = search(dis, crop, False)
        neg.append(res[0][1])
        print(f"out-of-KB {dis} / {crop}: best={kb[res[0][0]]['name']} ({res[0][1]:.2f})")
    print(f"\nin-KB exact-query top1 score: min={min(in_kb_top1):.2f} median={statistics.median(in_kb_top1):.2f}")
    print(f"out-of-KB top1 score: min={min(neg):.2f} max={max(neg):.2f}")
    print(f"overlap (largest out-of-KB >= smallest in-KB)? {max(neg) >= min(in_kb_top1)}")


if __name__ == "__main__":
    main()
