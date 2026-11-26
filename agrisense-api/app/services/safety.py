"""Keep unsourced agrochemical advice out of what users see and hear.

The knowledge base (diseases.json) has no source for any chemical product or dose, so the
app does not show chemical recommendations. This is enforced in code on the server:

- retrieved knowledge never includes chemical fields (rag.build_context),
- the treatment plan's chemical section is always replaced by a notice,
- every free-text field and the voice script are scanned, and text that names an
  agrochemical, a formulation code or a chemical-style dose is removed.

The scan is pattern based (a list of common active ingredients, formulation codes, generic
class words and dose units). It lowers the risk, it cannot prove a model never names a
product that is not on the list. Translated voice text is built only from text that already
passed this scan, and the translation prompt forbids adding anything.
"""
import re
from typing import List, Tuple

CHEMICAL_NOTICE = (
    "Chemical product and dose advice is not shown in this demo because it has not been "
    "checked against a reliable source. Ask a local agriculture officer or follow the label "
    "of a registered product."
)
SAFE_ACTION = (
    "Remove and isolate the affected plants or leaves if you can, avoid spreading the problem "
    "between plants, and ask a local agriculture officer what to do for this crop."
)

_INGREDIENTS = [
    "tricyclazole", "mancozeb", "carbendazim", "copper oxychloride", "copper sulphate",
    "copper sulfate", "bordeaux", "hexaconazole", "propiconazole", "chlorothalonil", "metalaxyl",
    "imidacloprid", "thiamethoxam", "azoxystrobin", "streptomycin", "tebuconazole", "difenoconazole",
    "chlorpyrifos", "cypermethrin", "profenofos", "acephate", "dimethoate", "malathion",
    "monocrotophos", "lambda", "deltamethrin", "fenvalerate", "carbofuran", "thiophanate",
    "captan", "zineb", "ziram", "sulphur", "sulfur", "validamycin", "kasugamycin", "isoprothiolane",
    "fosetyl", "cymoxanil", "dimethomorph", "pyraclostrobin", "trifloxystrobin", "hexythiazox",
    "spiromesifen", "fipronil", "emamectin", "spinosad", "glyphosate", "2,4-d", "atrazine",
    "paraquat", "benomyl", "fungicide", "pesticide", "insecticide", "herbicide", "bactericide",
    "acaricide", "miticide", "nematicide", "agrochemical", "chemical spray", "chemical control",
]
_ING = re.compile(r"(?<![a-z])(" + "|".join(re.escape(x) for x in _INGREDIENTS) + r")(?![a-z])", re.I)
_FORMULATION = re.compile(r"\b\d+(\.\d+)?\s*%?\s*(WP|EC|SC|SL|WG|WDG|DF|FS|ZC|OD|SP|GR)\b|\b(WP|WDG|EC)\b")
_DOSE = re.compile(
    r"\b\d+(\.\d+)?\s*(-\s*\d+(\.\d+)?\s*)?(ml|mL|g|gm|gram|grams|kg|l|ltr|litre|litres|liter|liters|cc|ppm|%)\b",
    re.I,
)
_PER = re.compile(r"\bper\s+(liter|litre|acre|hectare|ha|tank|pump|100\s*l)\b", re.I)


def has_chemical_advice(text: str) -> bool:
    return bool(_ING.search(text) or _FORMULATION.search(text) or _DOSE.search(text) or _PER.search(text))


def clean_text(text: str, fallback: str = "") -> Tuple[str, bool]:
    """Drop sentences that carry chemical advice. Returns (text, was_changed)."""
    if not isinstance(text, str) or not text:
        return text, False
    parts = re.split(r"(?<=[.!?\n])\s+", text)
    kept = [p for p in parts if not has_chemical_advice(p)]
    changed = len(kept) != len(parts)
    out = " ".join(kept).strip()
    if not out:
        out = fallback
    return out, changed


def clean_list(items: List[str]) -> Tuple[List[str], bool]:
    kept = [i for i in items if isinstance(i, str) and not has_chemical_advice(i)]
    return kept, len(kept) != len(items)


def sanitize_plan(plan: dict) -> dict:
    """Return the plan with no chemical product or dose, whatever the model produced."""
    out = dict(plan)
    out["chemical_treatment"] = None
    out["chemical_notice"] = CHEMICAL_NOTICE
    out["immediate_action"], _ = clean_text(out.get("immediate_action", ""), SAFE_ACTION)
    out["recovery_timeline"], _ = clean_text(out.get("recovery_timeline", ""), "Ask a local agriculture officer.")
    out["warning_signs"], _ = clean_text(out.get("warning_signs", ""), "If the problem spreads or gets worse, ask a local agriculture officer.")
    out["prevention_tips"], _ = clean_list(out.get("prevention_tips", []))
    org = dict(out.get("organic_treatment") or {})
    # Organic doses are also unsourced: keep the method and materials, drop any dose.
    org["method"], _ = clean_text(org.get("method", ""), "Ask a local agriculture officer about organic options for this crop.")
    org["materials"], _ = clean_list(org.get("materials", []))
    org["dosage"] = "Dose not shown (unsourced). Ask a local agriculture officer."
    out["organic_treatment"] = org
    return out
