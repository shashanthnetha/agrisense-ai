from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, scan, user, subscription, voice
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify real domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "AgriSense AI API"}

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(scan.router, prefix=f"{settings.API_V1_STR}/scan", tags=["Disease Detection"])
app.include_router(user.router, prefix=f"{settings.API_V1_STR}/user", tags=["User Profile"])
app.include_router(voice.router, prefix=f"{settings.API_V1_STR}/voice", tags=["Voice"])
app.include_router(subscription.router, prefix=f"{settings.API_V1_STR}/subscription", tags=["Subscriptions"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
