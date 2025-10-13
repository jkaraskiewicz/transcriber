import { WhisperTranscriptionService } from '../../services/WhisperTranscriptionService';
import { AudioConversionService } from '../../services/AudioConversionService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock AudioConversionService
jest.mock('../../services/AudioConversionService');

describe('WhisperTranscriptionService', () => {
  let service: WhisperTranscriptionService;
  const mockApiUrl = 'http://localhost:9000';
  let mockConvertToMp3: jest.Mock;

  beforeEach(() => {
    service = new WhisperTranscriptionService(mockApiUrl);
    mockConvertToMp3 = jest.fn();
    
    // Mock the AudioConversionService instance
    (AudioConversionService as jest.Mock).mockImplementation(() => ({
      convertToMp3: mockConvertToMp3,
    }));
    
    // Recreate service with mocked converter
    service = new WhisperTranscriptionService(mockApiUrl);
    
    jest.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('should return true when Whisper service is available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 422,
      });

      const result = await service.checkAvailability();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(`${mockApiUrl}/asr`, { method: 'POST' });
    });

    it('should return false when Whisper service is unavailable', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 500,
      });

      const result = await service.checkAvailability();

      expect(result).toBe(false);
    });

    it('should return false when fetch throws an error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.checkAvailability();

      expect(result).toBe(false);
    });
  });

  describe('transcribe', () => {
    const mockFile = {
      buffer: Buffer.from('mock audio data'),
      originalname: 'test.webm',
      mimetype: 'audio/webm',
      size: 1024,
    } as Express.Multer.File;

    it('should successfully transcribe audio and return text', async () => {
      const mockTranscription = 'This is a test transcription';
      
      // Mock audio conversion
      mockConvertToMp3.mockResolvedValueOnce({
        buffer: Buffer.from('converted audio data'),
        mimetype: 'audio/mpeg',
        originalname: 'test.mp3',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ text: mockTranscription }),
      });

      const result = await service.transcribe(mockFile);

      expect(result).toBe(mockTranscription);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/asr`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle text/plain response', async () => {
      const mockTranscription = 'Plain text transcription';
      
      // Mock audio conversion
      mockConvertToMp3.mockResolvedValueOnce({
        buffer: Buffer.from('converted audio data'),
        mimetype: 'audio/mpeg',
        originalname: 'test.mp3',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('text/plain'),
        },
        text: jest.fn().mockResolvedValue(mockTranscription),
      });

      const result = await service.transcribe(mockFile);

      expect(result).toBe(mockTranscription);
    });

    it('should throw error when Whisper service returns error', async () => {
      // Mock audio conversion
      mockConvertToMp3.mockResolvedValueOnce({
        buffer: Buffer.from('converted audio data'),
        mimetype: 'audio/mpeg',
        originalname: 'test.mp3',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Error details'),
      });

      await expect(service.transcribe(mockFile)).rejects.toThrow(
        'Whisper API error: 500 Error details'
      );
    });

    it('should throw error when network request fails', async () => {
      // Mock audio conversion
      mockConvertToMp3.mockResolvedValueOnce({
        buffer: Buffer.from('converted audio data'),
        mimetype: 'audio/mpeg',
        originalname: 'test.mp3',
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.transcribe(mockFile)).rejects.toThrow('Network error');
    });

    it('should throw error when response is empty', async () => {
      // Mock audio conversion
      mockConvertToMp3.mockResolvedValueOnce({
        buffer: Buffer.from('converted audio data'),
        mimetype: 'audio/mpeg',
        originalname: 'test.mp3',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
        json: jest.fn().mockResolvedValue({ text: '' }),
      });

      await expect(service.transcribe(mockFile)).rejects.toThrow(
        'Empty transcription result from Whisper'
      );
    });
  });
});
