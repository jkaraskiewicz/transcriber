import { Request, Response } from 'express';
import { TranscriptionController } from '../../controllers/TranscriptionController';
import { WhisperTranscriptionService } from '../../services/WhisperTranscriptionService';
import { GeminiCleanupService } from '../../services/GeminiCleanupService';

// Mock the services
jest.mock('../../services/WhisperTranscriptionService');
jest.mock('../../services/GeminiCleanupService');

describe('TranscriptionController', () => {
  let controller: TranscriptionController;
  let mockWhisperService: jest.Mocked<WhisperTranscriptionService>;
  let mockGeminiService: jest.Mocked<GeminiCleanupService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock services
    mockWhisperService = new WhisperTranscriptionService('http://test') as jest.Mocked<WhisperTranscriptionService>;
    mockGeminiService = new GeminiCleanupService('test-key', 'test-model') as jest.Mocked<GeminiCleanupService>;

    // Initialize controller with mocks
    controller = new TranscriptionController(mockWhisperService, mockGeminiService);

    // Setup response mock
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('transcribeAudio', () => {
    const mockFile = {
      buffer: Buffer.from('mock audio data'),
      originalname: 'test.webm',
      mimetype: 'audio/webm',
      size: 1024,
    } as Express.Multer.File;

    const mockRawTranscription = 'Umm, this is a test transcription, uh, you know.';
    const mockCleanedTranscription = 'This is a test transcription.';
    const mockIntelligentTranscription = 'This is a test transcription.';

    beforeEach(() => {
      mockRequest = {
        file: mockFile,
      };
    });

    it('should successfully transcribe and cleanup audio', async () => {
      mockWhisperService.transcribe = jest.fn().mockResolvedValue(mockRawTranscription);
      mockGeminiService.cleanupTranscript = jest.fn().mockResolvedValue(mockCleanedTranscription);
      mockGeminiService.intelligentCleanup = jest.fn().mockResolvedValue(mockIntelligentTranscription);

      await controller.transcribeAudio(mockRequest as Request, mockResponse as Response);

      expect(mockWhisperService.transcribe).toHaveBeenCalledWith(mockFile);
      expect(mockGeminiService.cleanupTranscript).toHaveBeenCalledWith(mockRawTranscription);
      expect(mockGeminiService.intelligentCleanup).toHaveBeenCalledWith(mockRawTranscription);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        original: mockRawTranscription,
        cleaned: mockCleanedTranscription,
        intelligent: mockIntelligentTranscription,
        message: 'Transcription and cleanup completed successfully',
      });
    });

    it('should return 400 when no file is provided', async () => {
      mockRequest.file = undefined;

      await controller.transcribeAudio(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No audio file provided',
      });
      expect(mockWhisperService.transcribe).not.toHaveBeenCalled();
      expect(mockGeminiService.cleanupTranscript).not.toHaveBeenCalled();
    });

    it('should handle Whisper transcription errors', async () => {
      const errorMessage = 'Whisper service error';
      mockWhisperService.transcribe = jest.fn().mockRejectedValue(new Error(errorMessage));

      await controller.transcribeAudio(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Transcription failed',
        message: errorMessage,
      });
      expect(mockGeminiService.cleanupTranscript).not.toHaveBeenCalled();
    });

    it('should handle Gemini cleanup errors', async () => {
      const errorMessage = 'Gemini service error';
      mockWhisperService.transcribe = jest.fn().mockResolvedValue(mockRawTranscription);
      mockGeminiService.cleanupTranscript = jest.fn().mockRejectedValue(new Error(errorMessage));
      mockGeminiService.intelligentCleanup = jest.fn().mockResolvedValue(mockIntelligentTranscription);

      await controller.transcribeAudio(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Transcription failed',
        message: errorMessage,
      });
    });

    it('should handle unknown errors', async () => {
      mockWhisperService.transcribe = jest.fn().mockRejectedValue('Unknown error');

      await controller.transcribeAudio(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Transcription failed',
        message: 'Unknown error occurred',
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when Whisper is available', async () => {
      mockWhisperService.checkAvailability = jest.fn().mockResolvedValue(true);

      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockWhisperService.checkAvailability).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          whisper: 'available',
          gemini: 'configured',
        },
      });
    });

    it('should return degraded status when Whisper is unavailable', async () => {
      mockWhisperService.checkAvailability = jest.fn().mockResolvedValue(false);

      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockWhisperService.checkAvailability).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          whisper: 'unavailable',
          gemini: 'configured',
        },
      });
    });
  });
});
