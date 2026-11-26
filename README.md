# 🌾 AgriSense AI — Crop Disease Detection from a Photo

<div align="center">

![AgriSense AI Banner](https://img.shields.io/badge/AgriSense-AI-green?style=for-the-badge&logo=leaf&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**AI-powered agricultural expert in your pocket. Detect crop diseases, get treatment plans, and hear advice in your language.**

[Demo](#demo) • [Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Architecture](#architecture)

</div>

---

## 🌍 The Problem

India loses **₹90,000 crore every year** to crop diseases. When a farmer notices something wrong with his crop, he has to:

- Walk to the nearest town to find an agricultural expert
- Wait **2-3 days** for a diagnosis
- By then, half the field is destroyed

**140 million farmers** face this every single season.

---

## ✅ The Solution

AgriSense AI gives every farmer an **AI agricultural expert in their pocket**.

Upload a photo of a diseased leaf → get an AI-assisted diagnosis, treatment plan, and voice explanation in their own language. Results are estimates; response time has not been benchmarked.

---

## 🎥 Demo

| Step | What Happens |
|------|-------------|
| 📸 Upload leaf photo | Farmer takes/uploads image |
| 🧠 AI analyzes | Gemini Vision detects disease |
| 📊 Results shown | Disease name, confidence, symptoms |
| 💊 Treatment plan | Organic and prevention guidance (chemical advice withheld, see below) |
| 🔊 Voice report | ElevenLabs speaks in Telugu/Hindi |

---

## ✨ Features

- 🔍 **AI Disease Detection** — Gemini vision analyzes a leaf photo (model set by `GEMINI_MODEL`)
- 📋 **Complete Treatment Plans** — Organic and prevention guidance. Chemical products and doses are not shown: the knowledge base has no source for them
- 🔊 **Multilingual Voice Reports** — English, Hindi, Telugu, Tamil via ElevenLabs
- 🧠 **RAG-Powered Knowledge** — Pinecone vector database seeded with 50 diseases
- 📱 **Mobile-First Design** — Responsive layout checked in desktop and 390px mobile Chrome (not yet on real phones)
- 🌐 **Docker setup** — Dockerfile and docker-compose for the API, PostgreSQL and Redis

---

## 🏗️ Architecture

```
Farmer's Phone
      ↓ uploads leaf photo
Next.js Frontend (Port 3000)
      ↓ POST /api/v1/scan/analyze
FastAPI Backend (Port 8000)
      ↓
  ┌──────────────────────────────────────┐
  │  1. OpenCV  →  Image Preprocessing  │
  │  2. Gemini  →  Disease Detection    │
  │  3. Pinecone → RAG Knowledge Search │
  │  4. Gemini  →  Treatment Generation │
  │  5. ElevenLabs → Voice Synthesis    │
  └──────────────────────────────────────┘
      ↓ JSON + base64 audio
Frontend displays results + plays voice
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 14 + TypeScript | React framework for the website |
| Tailwind CSS | Styling with green agricultural theme |
| Framer Motion | Smooth animations |
| Howler.js | Audio playback for voice reports |
| Axios | API communication |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI (Python) | API server and pipeline orchestration |
| Gemini (default `gemini-3.5-flash-lite`) | Vision AI for disease detection + treatment |
| Pinecone | Vector database for semantic disease search |
| ElevenLabs | High-quality multilingual voice synthesis |
| PostgreSQL | Persistent scan history storage |
| Redis | Response caching for speed |
| Docker | Containerization |

### AI Pipeline
| Stage | Algorithm/Model |
|-------|----------------|
| Image preprocessing | OpenCV (Bilateral Filter, CLAHE, Sharpening) |
| Disease detection | Gemini Vision Transformer (ViT) |
| Semantic search | Sentence Transformers + Cosine Similarity |
| Treatment generation | Gemini Language Model with RAG |
| Voice synthesis | ElevenLabs eleven_multilingual_v2 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker Desktop
- API Keys: Gemini, Pinecone, ElevenLabs

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/agrisense-ai.git
cd agrisense-ai
```

### 2. Set Up Backend

```bash
cd agrisense-api

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys
```

### 3. Configure API Keys

Edit `agrisense-api/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=agrisense-diseases
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Paid endpoints (/scan/analyze, /voice/generate) are CLOSED unless this is set;
# callers must send it in the X-Access-Key header (the scan page has a field for it).
ACCESS_KEY=choose_a_long_random_value
# Optional usage limits (in-memory, reset on restart; not billing-grade):
# SCANS_PER_IP_PER_HOUR=5  DAILY_SCAN_CAP=100  MONTHLY_VOICE_CAP=15  MAX_UPLOAD_MB=8
```

### 4. Seed the Disease Database

```bash
python -m app.services.seed_diseases
```

### 5. Start the Backend

```bash
docker-compose up -d
```

### 6. Set Up Frontend

```bash
cd ../agrisense-web
npm install
```

Create `agrisense-web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 7. Start the Frontend

```bash
npm run dev
```

### 8. Open the App

Visit **http://localhost:3000** 🎉

---

## 📁 Project Structure

```
agrisense-ai/
├── agrisense-api/              # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── scan.py         # Main scan endpoint
│   │   │   ├── voice.py        # Voice generation endpoint
│   │   │   └── auth.py         # Authentication
│   │   ├── services/
│   │   │   ├── detection.py    # Gemini Vision disease detection
│   │   │   ├── rag.py          # Pinecone RAG knowledge search
│   │   │   ├── treatment.py    # Treatment plan generation
│   │   │   ├── voice.py        # ElevenLabs voice synthesis
│   │   │   └── seed_diseases.py # Database seeding script
│   │   └── core/
│   │       └── config.py       # Settings and configuration
│   ├── docker-compose.yml      # Docker orchestration
│   ├── Dockerfile
│   └── requirements.txt
│
└── agrisense-web/              # Next.js Frontend
    └── src/
        ├── app/
        │   ├── page.tsx         # Landing page
        │   └── (dashboard)/
        │       ├── scan/        # Scan page
        │       └── history/     # Scan history
        ├── components/scan/
        │   ├── ImageUploader.tsx
        │   ├── AnalysisResults.tsx
        │   ├── TreatmentPlan.tsx
        │   └── VoicePlayer.tsx
        └── lib/
            ├── api.ts           # API client
            └── types.ts         # TypeScript types
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scan/analyze` | Analyze crop image — full pipeline |
| POST | `/api/v1/voice/generate` | Generate voice report in any language |
| GET | `/api/v1/scan/history` | Get scan history |
| GET | `/docs` | Interactive API documentation |

---

## 🌱 Supported Languages

| Language | Voice Support |
|----------|--------------|
| English | ✅ |
| Hindi | ✅ |
| Telugu | ✅ |
| Tamil | ✅ |

---

## 📈 Impact

- 🇮🇳 **140 million** Indian farmers who can benefit
- 💰 **₹90,000 crore** annual crop loss that can be reduced
- ⏱️ Faster first-pass diagnosis (not yet measured)
- 📱 Works on any smartphone with a camera

---

## 🗺️ Roadmap

- [ ] WhatsApp integration (farmer sends photo, gets voice reply)
- [ ] Offline mode with on-device AI models
- [ ] Expand disease database to 500+ diseases
- [ ] Weather-based disease prediction
- [ ] Nearby supplier map integration
- [ ] User authentication and personal history
- [ ] Government agriculture scheme integration

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Built By

**Shashanth Netha** — Built with passion to solve a real problem for 140 million Indian farmers.

---

<div align="center">

**⭐ Star this repo if you find it useful!**

*AgriSense AI — Because every farmer deserves a crop expert in their pocket.*

</div>

## Retrieval notes

- The Pinecone index `agrisense-diseases` stores 384-d MiniLM (`all-MiniLM-L6-v2`) vectors of
  `Disease: {name} Crop: {crop} Symptoms: {symptoms}`. The app embeds the query locally with the
  same model (fastembed ONNX) and sends the vector.
- The index also has a `llama-text-embed-v2` integration configured. Do not use Pinecone text
  search on it: that is a different embedding space and returns wrong matches.
- Only two stored vectors (`disease_0`, `disease_22`) were checked against a local embedding; the
  other records are assumed to follow the same seed script.
- `PINECONE_ENVIRONMENT`, `DATABASE_URL`, `REDIS_URL` and `SECRET_KEY` are not used at runtime yet.
