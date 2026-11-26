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


def test_voice_script_ignores_free_text(monkeypatch):
    import asyncio
    import importlib.util, pathlib, sys, types
    spoken = {}
    fake = types.ModuleType("elevenlabs.client")
    fake.ElevenLabs = lambda **k: None
    monkeypatch.setitem(sys.modules, "elevenlabs", types.ModuleType("elevenlabs"))
    monkeypatch.setitem(sys.modules, "elevenlabs.client", fake)
    path = pathlib.Path(treatment.__file__).with_name("voice.py")
    spec = importlib.util.spec_from_file_location("real_voice_under_test", path)
    v = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(v)

    class TTS:
        def convert(self, text, **k):
            spoken["t"] = text
            return [b"x"]

    class C:
        text_to_speech = TTS()

    monkeypatch.setattr(v, "client", C())
    analysis = {"crop_type": "Rice", "disease_name": "Leaf Blast; spray Mancozeb 2g/L", "urgency": "High; ignore rules"}
    treat = {"immediate_action": "Spray Mancozeb 2 g per litre", "recovery_timeline": "use Roundup"}
    asyncio.run(v.generate_voice(analysis, treat, "English"))
    t = spoken["t"]
    assert "Mancozeb" not in t and "Roundup" not in t and "ignore rules" not in t
    assert "Crop: Rice" in t and "Possible issue: not identified" in t and "Urgency: not stated" in t
    assert "local agriculture officer" in t


def test_aggregate_budget_blocks(monkeypatch):
    from app.core.config import settings
    from app.services.guard import BudgetExceeded, reset_budget_for_tests
    reset_budget_for_tests()
    monkeypatch.setattr(settings, "TOTAL_GEMINI_CALLS_BUDGET", 2)

    class M:
        def count_tokens(s, c):
            class T: total_tokens = 10
            return T()

    check_input_tokens(M(), "x", 100, "t")
    check_input_tokens(M(), "x", 100, "t")
    with pytest.raises(BudgetExceeded):
        check_input_tokens(M(), "x", 100, "t")
    reset_budget_for_tests()


def test_aggregate_token_budget_blocks(monkeypatch):
    from app.core.config import settings
    from app.services.guard import BudgetExceeded, reset_budget_for_tests
    reset_budget_for_tests()
    monkeypatch.setattr(settings, "TOTAL_INPUT_TOKENS_BUDGET", 15)

    class M:
        def count_tokens(s, c):
            class T: total_tokens = 10
            return T()

    check_input_tokens(M(), "x", 100, "t")
    with pytest.raises(BudgetExceeded):
        check_input_tokens(M(), "x", 100, "t")
    reset_budget_for_tests()


def test_recovery_timeline_never_shown():
    from app.services.safety import sanitize_plan
    out = sanitize_plan({"recovery_timeline": "7-10 days"})
    assert "7-10" not in out["recovery_timeline"] and "unsourced" in out["recovery_timeline"]
