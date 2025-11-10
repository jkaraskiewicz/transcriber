import express from 'express';
import cors from 'cors';
import { getConfig } from './config';
import { WhisperTranscriptionService } from './services/WhisperTranscriptionService';
import { GeminiCleanupService } from './services/GeminiCleanupService';
import { OpenRouterCleanupService } from './services/OpenRouterCleanupService';
import { ICleanupService } from './services/ICleanupService';
import { TranscriptionController } from './controllers/TranscriptionController';
import { upload, validateAudioFile, handleMulterError } from './middleware/fileValidation';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const config = getConfig();

const whisperService = new WhisperTranscriptionService(config.whisperUrl);

// Instantiate the appropriate cleanup service based on configuration
let cleanupService: ICleanupService;
if (config.cleanupProvider === 'openrouter') {
  cleanupService = new OpenRouterCleanupService(config.openrouterApiKey!, config.openrouterModel!);
  logger.info(`Using OpenRouter cleanup service with model: ${config.openrouterModel}`);
} else {
  cleanupService = new GeminiCleanupService(config.geminiApiKey!, config.geminiModel!);
  logger.info(`Using Gemini cleanup service with model: ${config.geminiModel}`);
}

const controller = new TranscriptionController(whisperService, cleanupService);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

app.get('/', controller.healthCheck);
app.get('/health', controller.healthCheck);

app.post(
  '/transcribe',
  upload.single('audio'),
  handleMulterError,
  validateAudioFile,
  controller.transcribeAudio
);

app.post('/cleanup-text', controller.cleanupText);

app.use(errorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(config.port, () => {
  logger.info(`Server is running at http://localhost:${config.port}`);
  logger.info(`Whisper URL: ${config.whisperUrl}`);
  logger.info(`Cleanup Provider: ${config.cleanupProvider}`);
});

export { app };
