import google.generativeai as genai
import json
import logging
from typing import List, Optional
from pydantic import BaseModel, ValidationError
from app.core.config import settings

from app.services.safety import CHEMICAL_NOTICE, sanitize_plan
from app.services.guard import check_input_tokens, log_usage

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

TREATMENT_PROMPT = """
You are Dr. AgriSense, an expert agricultural consultant.
Based on the following AI analysis and retrieved disease knowledge, create a comprehensive treatment plan for the farmer.

AI Analysis: {analysis_json}
Retrieved Knowledge: {rag_context}

Rules: do NOT name any pesticide, fungicide, insecticide, herbicide or other agrochemical, and do NOT give any chemical or spray dose, in any field. Describe only cultural and organic practices. The app shows chemical advice separately.

Return ONLY a valid JSON object in this format:
{{
  "immediate_action": "What the farmer should do right now",
  "organic_treatment": {{
    "method": "Detailed organic method",
    "materials": ["Material 1", "Material 2"],
    "dosage": "Leave as: Ask a local agriculture officer"
  }},
  "prevention_tips": ["Prevention 1", "Prevention 2"],
  "recovery_timeline": "Estimated days for recovery",
  "warning_signs": "What to watch out for if treatment fails"
}}
"""

class TreatmentError(Exception):
    """Raised when a treatment plan could not be generated or is unusable."""


class OrganicTreatment(BaseModel):
    method: str
    materials: List[str]
    dosage: str


class TreatmentPlan(BaseModel):
    """Schema the web app's TreatmentPlan component expects."""

    immediate_action: str
    organic_treatment: OrganicTreatment
    chemical_treatment: Optional[dict] = None  # whatever the model sends is discarded by sanitize_plan
    chemical_notice: str = CHEMICAL_NOTICE
    prevention_tips: List[str]
    recovery_timeline: str
    warning_signs: str


def parse_treatment(text: str) -> dict:
    text = (text or "").strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    try:
        data = json.loads(text)
        return sanitize_plan(TreatmentPlan(**data).model_dump())
    except (json.JSONDecodeError, ValidationError, TypeError) as e:
        raise TreatmentError("Treatment output was not a valid plan") from e


async def generate_treatment(analysis: dict, rag_context: str):
    """Return a validated treatment plan, or raise TreatmentError."""
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = TREATMENT_PROMPT.format(
            analysis_json=json.dumps(analysis),
            rag_context=rag_context
        )
        check_input_tokens(model, prompt, settings.MAX_INPUT_TOKENS_TREATMENT, "treatment")
        response = model.generate_content(
            prompt, generation_config={"max_output_tokens": settings.MAX_OUTPUT_TOKENS_TREATMENT}
        )
        log_usage(response, "treatment")
        return parse_treatment(response.text)
    except TreatmentError:
        logger.error("Treatment generation returned an unusable plan")
        raise
    except Exception as e:
        logger.error(f"Treatment generation error: {e}")
        raise TreatmentError("Treatment generation failed") from e
