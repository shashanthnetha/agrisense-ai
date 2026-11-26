import os
import sys
import types

# Settings needs these env vars at import time. Dummy values only; no network calls are made.
for key in [
    "SECRET_KEY", "DATABASE_URL", "REDIS_URL", "GEMINI_API_KEY", "PINECONE_API_KEY",
    "PINECONE_ENVIRONMENT", "PINECONE_INDEX_NAME", "ELEVENLABS_API_KEY",
]:
    os.environ.setdefault(key, "test")
os.environ.setdefault("ACCESS_KEY", "test-access-key")

# Replace the ElevenLabs voice service with a stub so the scan route can be tested
# without that package or any network access. The real treatment module is imported
# (google-generativeai is in requirements-dev); tests monkeypatch its model calls.
async def _voice(analysis, treatment, language):
    return b"audio"

for name, attr, fn in [
    ("app.services.voice", "generate_voice", _voice),
]:
    if name not in sys.modules:
        mod = types.ModuleType(name)
        setattr(mod, attr, fn)
        sys.modules[name] = mod


import pytest


@pytest.fixture(autouse=True)
def _reset_limits():
    from app.core import limits
    limits.reset_for_tests()
    yield
    limits.reset_for_tests()
