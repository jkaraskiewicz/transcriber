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
    return `You are an expert transcript editor and linguistic analyst. Your task is to aggressively correct and reconstruct this poor-quality transcription, making it logically coherent and readable.

**CORE PRINCIPLES:**
This transcription likely contains:
- Mistranscribed words (speech recognition errors)
- Misspoken or mispronounced words
- Incomplete thoughts and sentence fragments
- Words that sound similar but make no sense in context
- Missing punctuation causing run-on confusion

Your job is to BE BOLD in fixing these issues while preserving the speaker's intended meaning and argument structure.

**SPECIFIC INSTRUCTIONS:**

1. **Aggressive Fragment Removal**
   - Delete incomprehensible fragments at the start/end of sentences
   - Examples to DELETE entirely:
     * "Produce. Made, okay." (meaningless opening)
     * Random timestamps or noise words
     * Fragments that add no meaning: "you know", "like you know", "for some times"

2. **Context-Aware Word Substitution**
   - "pedestal up" → "goes up" (prices context)
   - "customer suffer that you know money from" → "customers who receive money from"
   - "governmental program" → "government program"
   - "magazines somewhere like a lockers" → "warehouses" or "storage"
   - "construction supporters" → "construction materials" or "construction supplies"
   - "to do a full of them" → "to fool them"
   - "presidential" (out of context) → remove or guess from context

3. **Sentence Reconstruction**
   - Fix run-on sentences by adding proper punctuation
   - "pretty much okay" at end of sentence → "pretty much, okay?"
   - Ensure sentences have clear subjects and predicates
   - Merge fragments into complete thoughts when the connection is obvious

4. **Question Detection**
   - When the speaker seems to be asking a question (tone suggests it), end with "?"
   - "how can that people..." → "how can people..." (fix grammar in questions)

5. **Preserve Core Arguments**
   - Keep the economic/political arguments intact
   - Maintain the logical flow of reasoning
   - Don't remove content that's part of the main argument

**WHAT TO PRIORITIZE:**
- Logical coherence > Literal transcription
- Readable sentences > Preserving every word
- Clear meaning > Exact word choice
- Grammar correctness > Raw transcript

**WHAT TO DELETE:**
- Completely nonsensical opening/closing fragments
- Repetitive false starts that add nothing
- Filler phrases that break sentence flow
- Words that are clearly transcription errors with no clear fix

The goal is to produce text that reads like a fluent (though perhaps not perfectly polished) speaker discussing economics or politics, where every sentence makes sense and contributes to their argument.

**Raw Transcription:**
---
${rawTranscript}
---

**Return ONLY the intelligently corrected transcription with NO additional explanations, headers, or metadata.**`;
  }
}
