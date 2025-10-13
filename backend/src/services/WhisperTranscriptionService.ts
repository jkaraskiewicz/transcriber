import { WhisperResponse } from '../types';
import { logger } from '../utils/logger';
import { AudioConversionService } from './AudioConversionService';

export class WhisperTranscriptionService {
  private audioConverter: AudioConversionService;

  constructor(private whisperUrl: string) {
    this.audioConverter = new AudioConversionService();
  }

  async transcribe(file: Express.Multer.File): Promise<string> {
    logger.info('Starting Whisper transcription', {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      whisperUrl: this.whisperUrl,
    });

    try {
      // Convert audio to MP3 format for better compatibility with Whisper
      const convertedAudio = await this.audioConverter.convertToMp3(file);
      
      const formData = new FormData();
      const audioBlob = new Blob([new Uint8Array(convertedAudio.buffer)], { 
        type: convertedAudio.mimetype 
      });
      formData.append('audio_file', audioBlob, convertedAudio.originalname);
      formData.append('task', 'transcribe');
      formData.append('output', 'txt');

      const response = await fetch(`${this.whisperUrl}/asr`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper API error: ${response.status} ${errorText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let transcription: string;

      if (contentType.includes('application/json')) {
        const result = (await response.json()) as WhisperResponse;
        transcription = result.text || '';
      } else {
        transcription = await response.text();
      }

      if (!transcription || transcription.trim().length === 0) {
        throw new Error('Empty transcription result from Whisper');
      }

      transcription = transcription.trim();

      logger.info('Whisper transcription completed', {
        filename: file.originalname,
        transcriptionLength: transcription.length,
      });

      return transcription;
    } catch (error) {
      logger.error('Whisper transcription failed', error, {
        filename: file.originalname,
        whisperUrl: this.whisperUrl,
      });
      throw error;
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      logger.debug('Checking Whisper service availability', { url: this.whisperUrl });

      const response = await fetch(`${this.whisperUrl}/asr`, {
        method: 'POST',
      });

      const isAvailable = response.status === 422;

      if (isAvailable) {
        logger.info('Whisper service is available', { url: this.whisperUrl });
      } else {
        logger.warn('Whisper service not available', {
          url: this.whisperUrl,
          status: response.status,
        });
      }

      return isAvailable;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Whisper service check failed', { url: this.whisperUrl, error: errorMessage });
      return false;
    }
  }
}
