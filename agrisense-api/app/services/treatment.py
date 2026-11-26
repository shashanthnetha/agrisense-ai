import google.generativeai as genai
import json
import logging
from typing import List
from pydantic import BaseModel, ValidationError
from app.core.config import settings

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

TREATMENT_PROMPT = """
You are Dr. AgriSense, an expert agricultural consultant.
Based on the following AI analysis and retrieved disease knowledge, create a comprehensive treatment plan for the farmer.

AI Analysis: {analysis_json}
Retrieved Knowledge: {rag_context}

Return ONLY a valid JSON object in this format:
{{
  "immediate_action": "What the farmer should do right now",
  "organic_treatment": {{
    "method": "Detailed organic method",
    "materials": ["Material 1", "Material 2"],
    "dosage": "Specific dosage instructions"
  }},
  "chemical_treatment": {{
    "product": "Specific chemical product",
    "active_ingredient": "Active chemical name",
    "dosage": "Specific dosage instructions"
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


class ChemicalTreatment(BaseModel):
    product: str
    active_ingredient: str
    dosage: str


class TreatmentPlan(BaseModel):
    """Schema the web app's TreatmentPlan component expects."""

    immediate_action: str
    organic_treatment: OrganicTreatment
    chemical_treatment: ChemicalTreatment
    prevention_tips: List[str]
    recovery_timeline: str
    warning_signs: str


def parse_treatment(text: str) -> dict:
    text = (text or "").strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    try:
        data = json.loads(text)
        return TreatmentPlan(**data).model_dump()
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
        response = model.generate_content(prompt)
        return parse_treatment(response.text)
    except TreatmentError:
        logger.error("Treatment generation returned an unusable plan")
        raise
    except Exception as e:
        logger.error(f"Treatment generation error: {e}")
        raise TreatmentError("Treatment generation failed") from e
