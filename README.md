# 🎙️ Audio Transcriber

A modern web application that records audio, transcribes it using OpenAI Whisper, and cleans up the transcription using Google Gemini AI to make speech sound cohesive and well-formed.

## ✨ Features

- 🎤 **Browser-based audio recording** - Record directly from your browser using the MediaRecorder API
- 📝 **Accurate transcription** - Powered by OpenAI Whisper ASR
- 🤖 **AI-powered cleanup** - Uses Google Gemini to remove filler words, pauses, and improve flow
- 🎨 **Modern UI** - Beautiful Material Design 3 interface built with Angular
- 🐳 **Docker-ready** - Complete containerization with docker-compose
- 📱 **Responsive design** - Works seamlessly on desktop and mobile

## 🏗️ Architecture

The application consists of three main services:

1. **Frontend** (Angular 18)
   - Standalone components with Signals-based state management
   - Material Design 3 UI components
   - Audio recording via MediaRecorder API
   - Responsive design with gradient backgrounds

2. **Backend** (Node.js + Express + TypeScript)
   - RESTful API endpoints
   - Clean architecture with separated services
   - Multer for file upload handling
   - Comprehensive error handling

3. **Whisper ASR Service** (Docker container)
   - OpenAI Whisper transcription engine
   - Handles audio file processing

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Google Gemini API key ([Get one here](https://ai.google.dev/))

### Installation

1. **Clone the repository**
   ```bash
   cd transcriber
   ```

2. **Set up environment variables**
   ```bash
   cd backend
   cp .env.example .env
   ```

3. **Add your Gemini API key**
   Edit `backend/.env` and add your API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the application**
   ```bash
   cd ..
   docker-compose up --build
   ```

5. **Open your browser**
   Navigate to `http://localhost:4206`
   
   Note: The frontend runs on port 4206 and the backend on port 3050. The frontend will automatically connect to the backend at `http://localhost:3050`.

## 🛠️ Development Setup

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

Note: The backend runs on port 3050 in development mode to avoid conflicts with other services. When running with Docker, it uses port 3001 internally but is exposed on port 3050.

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

Note: When running the frontend in development mode, it will connect to the backend at `http://localhost:3050`. Make sure the backend is running on that port.

## 📁 Project Structure

```
transcriber/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   │   ├── WhisperTranscriptionService.ts
│   │   │   └── GeminiCleanupService.ts
│   │   ├── middleware/       # Express middleware
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # Application entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/   # UI components
│   │   │   ├── services/     # Angular services
│   │   │   └── app.ts       # Root component
│   │   └── styles.scss      # Global styles
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── docker-compose.yml
```

## 🎯 How It Works

1. **Recording**: User clicks the microphone button to start/stop recording
2. **Upload**: Audio blob is sent to the backend via POST /transcribe
3. **Transcription**: Backend forwards audio to Whisper service for transcription
4. **Cleanup**: Raw transcription is sent to Gemini with a custom prompt
5. **Display**: Both original and cleaned transcriptions are shown in tabs

## 🔑 Key Technologies

### Frontend
- **Angular 18** - Modern TypeScript framework with standalone components
- **Angular Material 3** - Material Design UI components
- **RxJS** - Reactive programming with Observables
- **Signals** - Angular's new reactivity primitive

### Backend
- **Node.js 20** - JavaScript runtime
- **Express 5** - Web framework
- **TypeScript** - Type-safe JavaScript
- **Multer** - File upload handling
- **Google Generative AI** - Gemini SDK

### Infrastructure
- **Docker** - Containerization
- **nginx** - Web server for frontend
- **OpenAI Whisper** - ASR engine

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:headless      # Headless mode
```

## 📝 API Documentation

### POST /transcribe

Upload an audio file for transcription and cleanup.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `audio` (audio file, max 10MB)

**Response:**
```json
{
  "original": "Umm, so like, I was thinking that, uh, we should probably...",
  "cleaned": "I was thinking that we should probably...",
  "message": "Transcription and cleanup completed successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (no file, invalid format)
- `500` - Server error

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-11T10:30:00.000Z",
  "whisperAvailable": true
}
```

## 🎨 Customization

### Changing Colors

Edit `frontend/src/app/components/transcriber/transcriber.scss`:
```scss
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Adjusting Gemini Prompt

Edit `backend/src/services/GeminiCleanupService.ts` to customize the cleanup behavior.

### Whisper Model Selection

In `docker-compose.yml`, change the Whisper model:
```yaml
environment:
  - ASR_MODEL=base  # Options: tiny, base, small, medium, large
```

## 🐛 Troubleshooting

### Audio not recording
- Check browser permissions for microphone access
- Ensure using HTTPS or localhost
- Try a different browser (Chrome/Edge recommended)

### Transcription fails
- Verify Whisper service is running: `docker-compose ps`
- Check Whisper logs: `docker-compose logs whisper`
- Ensure audio file is under 10MB

### Cleanup fails
- Verify `GEMINI_API_KEY` is set correctly
- Check backend logs: `docker-compose logs backend`
- Ensure API key has proper permissions

## 🤝 Contributing

Contributions are welcome! Please follow the clean code principles outlined in `PROGRAMMING.md`.

## 📄 License

MIT License - feel free to use this project however you'd like!

## 🙏 Acknowledgments

- OpenAI Whisper for excellent transcription
- Google Gemini for powerful text cleanup
- Angular team for the amazing framework
- Material Design for the beautiful UI components
