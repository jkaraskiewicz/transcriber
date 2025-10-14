import { AudioConversionService } from '../../services/AudioConversionService';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink, readFile } from 'fs/promises';

// Mock fluent-ffmpeg and fs/promises
jest.mock('fluent-ffmpeg');
jest.mock('fs/promises');

describe('AudioConversionService', () => {
  let service: AudioConversionService;
  let mockFfmpegInstance: any;

  beforeEach(() => {
    service = new AudioConversionService();

    // Create mock ffmpeg instance with chainable methods
    mockFfmpegInstance = {
      audioCodec: jest.fn().mockReturnThis(),
      audioBitrate: jest.fn().mockReturnThis(),
      audioChannels: jest.fn().mockReturnThis(),
      audioFrequency: jest.fn().mockReturnThis(),
      format: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      save: jest.fn(),
    };

    (ffmpeg as unknown as jest.Mock).mockReturnValue(mockFfmpegInstance);

    // Mock fs/promises functions
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (unlink as jest.Mock).mockResolvedValue(undefined);

    jest.clearAllMocks();
  });

  describe('convertToMp3', () => {
    const mockFile = {
      buffer: Buffer.from('mock audio data'),
      originalname: 'test.m4a',
      mimetype: 'audio/m4a',
      size: 1024,
    } as Express.Multer.File;

    it('should successfully convert audio to MP3', async () => {
      const mockConvertedBuffer = Buffer.from('converted mp3 data');

      // Mock readFile to return the converted buffer
      (readFile as jest.Mock).mockResolvedValue(mockConvertedBuffer);

      // Setup mock to emit 'end' event
      mockFfmpegInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegInstance;
      });

      const result = await service.convertToMp3(mockFile);

      expect(result.buffer).toEqual(mockConvertedBuffer);
      expect(result.mimetype).toBe('audio/mpeg');
      expect(result.originalname).toBe('test.mp3');
      expect(mockFfmpegInstance.audioCodec).toHaveBeenCalledWith('libmp3lame');
      expect(mockFfmpegInstance.audioBitrate).toHaveBeenCalledWith('192k');
      expect(mockFfmpegInstance.audioChannels).toHaveBeenCalledWith(1);
      expect(mockFfmpegInstance.audioFrequency).toHaveBeenCalledWith(16000);
      expect(mockFfmpegInstance.format).toHaveBeenCalledWith('mp3');
      expect(mockFfmpegInstance.save).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalled();
      expect(readFile).toHaveBeenCalled();
      expect(unlink).toHaveBeenCalledTimes(2); // Clean up both temp files
    });

    it('should handle WAV file conversion', async () => {
      const wavFile = {
        ...mockFile,
        originalname: 'test.wav',
        mimetype: 'audio/wav',
      } as Express.Multer.File;

      (readFile as jest.Mock).mockResolvedValue(Buffer.from('converted data'));

      mockFfmpegInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegInstance;
      });

      const result = await service.convertToMp3(wavFile);

      expect(result.originalname).toBe('test.mp3');
    });

    it('should handle WebM file conversion', async () => {
      const webmFile = {
        ...mockFile,
        originalname: 'test.webm',
        mimetype: 'audio/webm',
      } as Express.Multer.File;

      (readFile as jest.Mock).mockResolvedValue(Buffer.from('converted data'));

      mockFfmpegInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegInstance;
      });

      const result = await service.convertToMp3(webmFile);

      expect(result.originalname).toBe('test.mp3');
    });

    it('should handle OGG file conversion', async () => {
      const oggFile = {
        ...mockFile,
        originalname: 'test.ogg',
        mimetype: 'audio/ogg',
      } as Express.Multer.File;

      (readFile as jest.Mock).mockResolvedValue(Buffer.from('converted data'));

      mockFfmpegInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegInstance;
      });

      const result = await service.convertToMp3(oggFile);

      expect(result.originalname).toBe('test.mp3');
    });

    it('should throw error when conversion fails', async () => {
      const errorMessage = 'FFmpeg conversion failed';

      // Need to make sure writeFile succeeds so we get to the ffmpeg error
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('data'));

      mockFfmpegInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === 'error') {
          // Trigger error event immediately
          setTimeout(() => callback(new Error(errorMessage)), 0);
        }
        return mockFfmpegInstance;
      });

      await expect(service.convertToMp3(mockFile)).rejects.toThrow(
        `Audio conversion failed: ${errorMessage}`
      );

      // Verify cleanup was attempted (2 calls for both temp files)
      expect(unlink).toHaveBeenCalled();
    });

    it('should handle read file errors gracefully', async () => {
      const readError = new Error('Failed to read output file');

      // First call to readFile (inside the 'end' handler) should fail
      (readFile as jest.Mock).mockRejectedValue(readError);

      mockFfmpegInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegInstance;
      });

      await expect(service.convertToMp3(mockFile)).rejects.toThrow(
        'Failed to read converted audio file'
      );

      // Verify cleanup was attempted
      expect(unlink).toHaveBeenCalled();
    });
  });
});
