import logging
import google.generativeai as genai
from elevenlabs.client import ElevenLabs
from app.core.config import settings

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

        # Translate if not English
        if language != "English":
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            response = model.generate_content(
                f"Translate this agricultural report to {LANGUAGE_NAMES[language]}. "
                f"Keep it natural and clear for farmers. Only return the translated text, nothing else:\n\n{script}"
            )
            script = response.text

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
