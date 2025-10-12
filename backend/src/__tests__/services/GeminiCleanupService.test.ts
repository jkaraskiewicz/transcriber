import { GeminiCleanupService } from '../../services/GeminiCleanupService';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Gemini SDK
jest.mock('@google/generative-ai');

describe('GeminiCleanupService', () => {
  let service: GeminiCleanupService;
  const mockApiKey = 'test-api-key';
  const mockModelName = 'gemini-2.0-flash-exp';
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    service = new GeminiCleanupService(mockApiKey, mockModelName);
  });

  describe('cleanupTranscript', () => {
    const mockRawTranscript = 'Umm, so like, I was thinking that, uh, we should probably do this.';
    const mockCleanedTranscript = 'I was thinking that we should probably do this.';

    it('should successfully cleanup transcript', async () => {
      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(mockCleanedTranscript),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.cleanupTranscript(mockRawTranscript);

      expect(result).toBe(mockCleanedTranscript);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('You are an expert transcript editor')
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(mockRawTranscript)
      );
    });

    it('should trim whitespace from cleaned transcript', async () => {
      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(`  ${mockCleanedTranscript}  `),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.cleanupTranscript(mockRawTranscript);

      expect(result).toBe(mockCleanedTranscript);
    });

    it('should throw error when Gemini API fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(service.cleanupTranscript(mockRawTranscript)).rejects.toThrow(
        'Failed to cleanup transcript with Gemini'
      );
    });

    it('should throw error when response is empty', async () => {
      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(''),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(service.cleanupTranscript(mockRawTranscript)).rejects.toThrow(
        'Failed to cleanup transcript with Gemini'
      );
    });

    it('should include all critical rules in the prompt', async () => {
      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(mockCleanedTranscript),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      await service.cleanupTranscript(mockRawTranscript);

      const callArg = mockGenerateContent.mock.calls[0][0];

      // Verify critical rules are in the prompt
      expect(callArg).toContain('DO NOT summarize');
      expect(callArg).toContain('Remove filler words');
      expect(callArg).toContain('Remove pause markers');
      expect(callArg).toContain('Fix grammar');
      expect(callArg).toContain('Preserve all facts');
    });

    it('should handle special characters in transcript', async () => {
      const specialTranscript = 'Umm, I said "hello" & they replied!';
      const cleanedSpecial = 'I said "hello" and they replied!';

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(cleanedSpecial),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.cleanupTranscript(specialTranscript);

      expect(result).toBe(cleanedSpecial);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(specialTranscript)
      );
    });
  });
});
