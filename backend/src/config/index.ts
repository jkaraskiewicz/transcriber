import dotenv from 'dotenv';
import { ServiceConfig } from '../types';

dotenv.config();

export const getConfig = (): ServiceConfig => {
  const cleanupProvider = (process.env.CLEANUP_PROVIDER || 'gemini').toLowerCase() as 'gemini' | 'openrouter';

  const config: ServiceConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    whisperUrl: process.env.WHISPER_API_URL || 'http://localhost:9000',
    cleanupProvider,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
  };

  // Validate that the required API key for the selected provider is present
  if (cleanupProvider === 'gemini' && !config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required when using Gemini provider');
  }

  if (cleanupProvider === 'openrouter' && !config.openrouterApiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required when using OpenRouter provider');
  }

  return config;
};
