export interface ICleanupService {
  /**
   * Clean up a raw transcript by removing filler words, fixing grammar,
   * and improving readability while preserving all content
   */
  cleanupTranscript(rawTranscript: string): Promise<string>;

  /**
   * Intelligently clean up a transcript with aggressive corrections,
   * fixing transcription errors and reconstructing logical coherence
   */
  intelligentCleanup(rawTranscript: string): Promise<string>;
}
