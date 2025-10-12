import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export class GeminiCleanupService {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async cleanupTranscript(rawTranscript: string): Promise<string> {
    logger.debug('Starting transcript cleanup with Gemini', {
      transcriptLength: rawTranscript.length,
    });

    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = this.buildCleanupPrompt(rawTranscript);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const cleaned = response.text().trim();

      if (!cleaned || cleaned.length === 0) {
        throw new Error('Empty response from Gemini');
      }

      logger.debug('Gemini cleanup completed', {
        originalLength: rawTranscript.length,
        cleanedLength: cleaned.length,
      });

      return cleaned;
    } catch (error) {
      logger.error('Gemini cleanup failed', error);
      throw new Error('Failed to cleanup transcript with Gemini');
    }
  }

  private buildCleanupPrompt(rawTranscript: string): string {
    return `You are an expert transcript editor. Your task is to clean up this raw speech transcription and make it sound fluent and well-formed, while preserving ALL the original content and meaning.

**CRITICAL RULES:**
1. **DO NOT summarize** - Keep all the content, ideas, and details from the original
2. **Remove filler words**: umm, uh, like, you know, basically, actually, etc.
3. **Remove pause markers**: [pause], ..., (pause), etc.
4. **Fix grammar and sentence structure** to make it read smoothly
5. **Remove false starts and repetitions** (e.g., "I think I think" → "I think")
6. **Maintain the speaker's voice and tone** - don't make it overly formal
7. **Keep the same level of detail** - expand nothing, remove nothing important
8. **Fix run-on sentences** and improve flow
9. **Preserve all facts, numbers, names, and specific details** exactly as stated

The output should read like a well-formed transcription from someone speaking clearly and confidently, not like a summary or rewrite.

**Raw Transcription:**
---
${rawTranscript}
---

**Return ONLY the cleaned transcription with NO additional explanations, headers, or metadata.**`;
  }
}
