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
    return this.processTranscript(rawTranscript, 'cleanup');
  }

  async intelligentCleanup(rawTranscript: string): Promise<string> {
    return this.processTranscript(rawTranscript, 'intelligent');
  }

  private async processTranscript(rawTranscript: string, mode: 'cleanup' | 'intelligent'): Promise<string> {
    logger.debug(`Starting transcript ${mode} with Gemini`, {
      transcriptLength: rawTranscript.length,
    });

    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = mode === 'cleanup'
        ? this.buildCleanupPrompt(rawTranscript)
        : this.buildIntelligentPrompt(rawTranscript);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const cleaned = response.text().trim();

      if (!cleaned || cleaned.length === 0) {
        throw new Error('Empty response from Gemini');
      }

      logger.debug(`Gemini ${mode} completed`, {
        originalLength: rawTranscript.length,
        cleanedLength: cleaned.length,
      });

      return cleaned;
    } catch (error) {
      logger.error(`Gemini ${mode} failed`, error);
      throw new Error(`Failed to ${mode} transcript with Gemini`);
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

  private buildIntelligentPrompt(rawTranscript: string): string {
    return `You are an expert transcript editor with deep linguistic understanding. Your task is to intelligently correct and clean up this raw speech transcription, making educated guesses about mistranscribed or misspoken words while preserving the original structure and meaning.

**YOUR MISSION:**
1. **Preserve structure and flow** - Follow the original speech structure, tone, and voice. Do NOT summarize or restructure unnecessarily.
2. **Remove standard issues**: filler words (umm, uh, like, you know), pause markers, false starts, repetitions.
3. **Fix grammar and sentence structure** to improve readability.
4. **Intelligent word correction** - This is KEY:
   - Detect words/phrases that are logically out of place or don't make sense in context
   - Make educated guesses about what the speaker MEANT to say:
     * Consider phonetically similar words that would make sense
     * Consider the context and topic being discussed
     * Look for transcription errors where similar-sounding words were confused
   - If a word/phrase is beyond rescuing and breaks the sentence flow, remove it
   - Mark uncertain corrections by keeping the flow natural (don't add brackets or notes)

**EXAMPLES OF INTELLIGENT CORRECTION:**
- "governmental program" → "government program" (if that makes more sense)
- "pedestal up" → "goes up" or "increases" (phonetic similarity + context)
- "customer suffer that you know money" → "customers who receive money" (structural correction)
- "magazines somewhere like a lockers" → "storage facilities" or remove entirely if unclear
- "to do a full of them" → remove or correct to "fool them" based on context

**CRITICAL RULES:**
- Maintain ALL important content and ideas
- Keep the same level of detail
- Don't make it overly formal - preserve the speaker's voice
- Only correct words that clearly don't make sense
- When in doubt between two interpretations, choose the one that fits the context better
- Remove fragments only if they're truly incomprehensible

The output should read like a well-formed, logical transcription where the speaker's intent is clear, even if some original words were mistranscribed or misspoken.

**Raw Transcription:**
---
${rawTranscript}
---

**Return ONLY the intelligently corrected transcription with NO additional explanations, headers, or metadata.**`;
  }
}
