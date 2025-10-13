# 🎙️ Audio Transcriber

A web application that records audio, transcribes it using OpenAI Whisper, and cleans up the transcription using Google Gemini AI.

## Tech Stack

- **Frontend**: Angular 20 with Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **AI**: OpenAI Whisper + Google Gemini

## Quick Start

### Prerequisites
- Docker and Docker Compose
- OpenAI API key
- Google Gemini API key

### Installation

```bash
# Set up environment variables
cd backend
cp .env.example .env
# Edit .env and add your API keys

# Start with Docker
docker-compose up -d

# Or use published images
docker-compose -f docker-compose.prod.yml up -d
```

Open http://localhost:4206

## Development

```bash
# Backend
cd backend
npm install
npm run dev        # Port 3050

# Frontend
cd frontend
npm install
npm start          # Port 4200

# Tests
npm test          # Run from backend or frontend
```

## Deployment

The project includes GitHub Actions workflow that builds and publishes Docker images to `ghcr.io` on every push to master.

```bash
# Pull and run published images
docker-compose -f docker-compose.prod.yml up -d
```

For production, use nginx reverse proxy to route `/api/*` requests to the backend.

## License

MIT
