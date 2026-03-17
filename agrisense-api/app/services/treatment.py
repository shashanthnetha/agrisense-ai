import google.generativeai as genai
import json
import logging
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

async def generate_treatment(analysis: dict, rag_context: str):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        
        prompt = TREATMENT_PROMPT.format(
            analysis_json=json.dumps(analysis),
            rag_context=rag_context
        )
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
            
        treatment = json.loads(text)
        return treatment
    except Exception as e:
        logger.error(f"Treatment generation error: {e}")
        return {
            "error": "Failed to generate treatment plan",
            "details": str(e)
        }
