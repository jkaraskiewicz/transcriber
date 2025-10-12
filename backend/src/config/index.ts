import dotenv from 'dotenv';
import { ServiceConfig } from '../types';

dotenv.config();

export const getConfig = (): ServiceConfig => {
  const config: ServiceConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    whisperUrl: process.env.WHISPER_API_URL || 'http://localhost:9000',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
  };

  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return config;
};
