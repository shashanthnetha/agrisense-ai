import logging
import google.generativeai as genai
from elevenlabs.client import ElevenLabs
from app.core.config import settings

from app.services.safety import clean_text
from app.services.guard import check_input_tokens, log_usage

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)
client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)

LANGUAGE_NAMES = {
    "English": "English",
    "Hindi": "Hindi",
    "Tamil": "Tamil",
    "Telugu": "Telugu"
}

async def generate_voice(analysis: dict, treatment: dict, language: str = "English"):
    try:
        script = f"""
        AgriSense AI Crop Health Report.
        Crop: {analysis.get('crop_type')}.
        Disease: {analysis.get('disease_name')}.
        Urgency: {analysis.get('urgency')}.
        Immediate Action: {treatment.get('immediate_action')}.
        Recovery Timeline: {treatment.get('recovery_timeline')}.
        """

        # Never speak chemical advice, whatever the caller or model supplied
        script, _ = clean_text(script, "Please ask a local agriculture officer for advice.")

        # Translate if not English
        if language != "English":
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            prompt = (
                f"Translate this agricultural report to {LANGUAGE_NAMES[language]}. "
                f"Keep it natural and clear for farmers. Translate only. Add nothing, and do not add any product names or doses. Only return the translated text, nothing else:\n\n{script}"
            )
            check_input_tokens(model, prompt, settings.MAX_INPUT_TOKENS_TRANSLATION, "translation")
            response = model.generate_content(
                prompt,
                generation_config={"max_output_tokens": settings.MAX_OUTPUT_TOKENS_TRANSLATION},
            )
            log_usage(response, "translation")
            script, _ = clean_text(response.text, "Please ask a local agriculture officer for advice.")

        script = script[: settings.MAX_VOICE_CHARS]
        audio = client.text_to_speech.convert(
            text=script,
            voice_id="ErXwobaYiN019PkySvjV",
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )

        audio_bytes = b"".join(audio)
        return audio_bytes

    except Exception as e:
        logger.error(f"Voice generation error: {e}")
        return None
