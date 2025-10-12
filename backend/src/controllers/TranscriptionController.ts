import { Request, Response } from 'express';
import { WhisperTranscriptionService } from '../services/WhisperTranscriptionService';
import { GeminiCleanupService } from '../services/GeminiCleanupService';
import { TranscriptionResponse } from '../types';
import { logger } from '../utils/logger';

export class TranscriptionController {
  constructor(
    private whisperService: WhisperTranscriptionService,
    private geminiService: GeminiCleanupService
  ) {}

  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    const whisperAvailable = await this.whisperService.checkAvailability();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        whisper: whisperAvailable ? 'available' : 'unavailable',
        gemini: 'configured',
      },
    });
  };

  transcribeAudio = async (req: Request, res: Response): Promise<void> => {
    const { file } = req;

    if (!file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    logger.info('Starting transcription process', {
      filename: file.originalname,
      size: file.size,
    });

    try {
      const rawTranscription = await this.whisperService.transcribe(file);
      logger.info('Transcription completed, starting cleanup', {
        filename: file.originalname,
        rawLength: rawTranscription.length,
      });

      const cleanedTranscription = await this.geminiService.cleanupTranscript(rawTranscription);

      logger.info('Cleanup completed', {
        filename: file.originalname,
        cleanedLength: cleanedTranscription.length,
      });

      const response: TranscriptionResponse = {
        original: rawTranscription,
        cleaned: cleanedTranscription,
        message: 'Transcription and cleanup completed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Transcription process failed', error, {
        filename: file.originalname,
      });

      res.status(500).json({
        error: 'Transcription failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  cleanupText = async (req: Request, res: Response): Promise<void> => {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'No text provided or text is empty' });
      return;
    }

    logger.info('Starting text cleanup process', {
      textLength: text.length,
    });

    try {
      const cleanedText = await this.geminiService.cleanupTranscript(text);

      logger.info('Text cleanup completed', {
        originalLength: text.length,
        cleanedLength: cleanedText.length,
      });

      const response: TranscriptionResponse = {
        original: text,
        cleaned: cleanedText,
        message: 'Text cleanup completed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Text cleanup process failed', error);

      res.status(500).json({
        error: 'Text cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };
}
