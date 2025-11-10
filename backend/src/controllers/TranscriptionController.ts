import { Request, Response } from 'express';
import { WhisperTranscriptionService } from '../services/WhisperTranscriptionService';
import { ICleanupService } from '../services/ICleanupService';
import { TranscriptionResponse } from '../types';
import { logger } from '../utils/logger';

export class TranscriptionController {
  constructor(
    private whisperService: WhisperTranscriptionService,
    private cleanupService: ICleanupService
  ) {}

  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    const whisperAvailable = await this.whisperService.checkAvailability();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        whisper: whisperAvailable ? 'available' : 'unavailable',
        cleanup: 'configured',
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

      // Run both cleanup modes in parallel
      const [cleanedTranscription, intelligentTranscription] = await Promise.all([
        this.cleanupService.cleanupTranscript(rawTranscription),
        this.cleanupService.intelligentCleanup(rawTranscription),
      ]);

      logger.info('Cleanup completed', {
        filename: file.originalname,
        cleanedLength: cleanedTranscription.length,
        intelligentLength: intelligentTranscription.length,
      });

      const response: TranscriptionResponse = {
        original: rawTranscription,
        cleaned: cleanedTranscription,
        intelligent: intelligentTranscription,
        message: 'Transcription and cleanup completed successfully',
      };

      res.status(201).json(response);
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
      // Run both cleanup modes in parallel
      const [cleanedText, intelligentText] = await Promise.all([
        this.cleanupService.cleanupTranscript(text),
        this.cleanupService.intelligentCleanup(text),
      ]);

      logger.info('Text cleanup completed', {
        originalLength: text.length,
        cleanedLength: cleanedText.length,
        intelligentLength: intelligentText.length,
      });

      const response: TranscriptionResponse = {
        original: text,
        cleaned: cleanedText,
        intelligent: intelligentText,
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
