export interface TranscriptionRequest {
  file?: Express.Multer.File;
}

export interface TranscriptionResponse {
  original: string;
  cleaned: string;
  message: string;
}

export interface ServiceConfig {
  port: number;
  whisperUrl: string;
  geminiApiKey: string;
  geminiModel: string;
}

export interface WhisperResponse {
  text: string;
  language?: string;
}

export interface GeminiCleanupResult {
  cleaned: string;
}
