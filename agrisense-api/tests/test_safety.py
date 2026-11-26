import json
import pytest
from app.services import treatment, voice
from app.services.safety import sanitize_plan, has_chemical_advice, clean_text, CHEMICAL_NOTICE
from app.services.guard import InputTooLarge, check_input_tokens

BAD = {
    "immediate_action": "Remove leaves. Spray Mancozeb 2.5 g per litre today.",
    "organic_treatment": {"method": "Neem oil. Mix 5 ml/L and spray.", "materials": ["neem oil", "Carbendazim 50% WP"], "dosage": "5 ml/L"},
    "chemical_treatment": {"product": "Tricyclazole 75% WP", "active_ingredient": "Tricyclazole", "dosage": "0.6 g per litre"},
    "prevention_tips": ["Rotate crops", "Use fungicide weekly"],
    "recovery_timeline": "7-10 days",
    "warning_signs": "Spreading spots. Apply imidacloprid 0.5 ml/L.",
}


def test_plan_has_no_chemical_anything():
    out = sanitize_plan(treatment.TreatmentPlan(**BAD).model_dump())
    blob = json.dumps(out)
    assert out["chemical_treatment"] is None and out["chemical_notice"] == CHEMICAL_NOTICE
    for w in ["Mancozeb", "Carbendazim", "Tricyclazole", "imidacloprid", "fungicide", "g per litre", "5 ml"]:
        assert w.lower() not in blob.lower().replace(CHEMICAL_NOTICE.lower(), ""), w
    assert out["prevention_tips"] == ["Rotate crops"]
    assert "Remove leaves." in out["immediate_action"]


@pytest.mark.parametrize("t", ["Spray 2 ml per litre", "Use Mancozeb", "Apply 75% WP", "mix 3g in water", "use a pesticide"])
def test_detects(t):
    assert has_chemical_advice(t)


def test_ok_text_kept():
    assert not has_chemical_advice("Remove infected leaves and improve airflow. Recovery in 7-10 days.")


def test_generate_treatment_output_clean(monkeypatch):
    class R: text = json.dumps(BAD)
    class M:
        def __init__(s, *a, **k): pass
        def count_tokens(s, c):
            class T: total_tokens = 100
            return T()
        def generate_content(s, *a, **k): return R()
    monkeypatch.setattr(treatment.genai, "GenerativeModel", M)
    import asyncio
    out = asyncio.run(treatment.generate_treatment({"a": 1}, "ctx"))
    assert "mancozeb" not in json.dumps(out).lower() and out["chemical_treatment"] is None


def test_voice_script_cleaned_even_if_caller_supplies_chemicals():
    t, changed = clean_text("Disease found. Spray Mancozeb 2 g per litre. Remove leaves.")
    assert changed and "mancozeb" not in t.lower() and "Remove leaves" in t


def test_count_tokens_aborts_over_cap():
    class M:
        def count_tokens(s, c):
            class T: total_tokens = 99999
            return T()
    with pytest.raises(InputTooLarge):
        check_input_tokens(M(), "x", 100, "t")


def test_count_tokens_error_fails_closed():
    class M:
        def count_tokens(s, c): raise RuntimeError("down")
    with pytest.raises(RuntimeError):
        check_input_tokens(M(), "x", 100, "t")
