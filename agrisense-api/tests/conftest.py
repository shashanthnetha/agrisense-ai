import os
import sys
import types

# Settings needs these env vars at import time. Dummy values only; no network calls are made.
for key in [
    "SECRET_KEY", "DATABASE_URL", "REDIS_URL", "GEMINI_API_KEY", "PINECONE_API_KEY",
    "PINECONE_ENVIRONMENT", "PINECONE_INDEX_NAME", "ELEVENLABS_API_KEY",
]:
    os.environ.setdefault(key, "test")

# Replace the heavy services (Pinecone, sentence-transformers, ElevenLabs) with stubs
# so the scan route can be tested without those packages or any network access.
async def _rag(disease=None, crop=None):
    return "ctx"

async def _treatment(analysis, ctx):
    return {"immediate_action": "x"}

async def _voice(analysis, treatment, language):
    return b"audio"

for name, attr, fn in [
    ("app.services.rag", "query_disease_knowledge", _rag),
    ("app.services.treatment", "generate_treatment", _treatment),
    ("app.services.voice", "generate_voice", _voice),
]:
    if name not in sys.modules:
        mod = types.ModuleType(name)
        setattr(mod, attr, fn)
        sys.modules[name] = mod
