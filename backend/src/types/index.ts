export interface TranscriptionRequest {
  file?: Express.Multer.File;
}

export interface TranscriptionResponse {
  original: string;
  cleaned: string;
  intelligent?: string;
  message: string;
}

export interface ServiceConfig {
  port: number;
  whisperUrl: string;
  cleanupProvider: 'gemini' | 'openrouter';
  geminiApiKey?: string;
  geminiModel?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
}

export interface WhisperResponse {
  text: string;
  language?: string;
}

export interface GeminiCleanupResult {
  cleaned: string;
}
