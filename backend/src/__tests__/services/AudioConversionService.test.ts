import { AudioConversionService } from '../../services/AudioConversionService';
import ffmpeg from 'fluent-ffmpeg';

// Mock fluent-ffmpeg
jest.mock('fluent-ffmpeg');

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
      pipe: jest.fn().mockReturnValue({
        on: jest.fn(),
      }),
    };

    (ffmpeg as unknown as jest.Mock).mockReturnValue(mockFfmpegInstance);
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

      // Setup mock to emit 'end' event and collect chunks
      mockFfmpegInstance.pipe.mockReturnValue({
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate data chunks
            callback(mockConvertedBuffer);
          }
          return { on: jest.fn() };
        }),
      });

      mockFfmpegInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === 'end') {
          // Trigger end event immediately
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
    });

    it('should handle WAV file conversion', async () => {
      const wavFile = {
        ...mockFile,
        originalname: 'test.wav',
        mimetype: 'audio/wav',
      } as Express.Multer.File;

      mockFfmpegInstance.pipe.mockReturnValue({
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('converted data'));
          }
          return { on: jest.fn() };
        }),
      });

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

      mockFfmpegInstance.pipe.mockReturnValue({
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('converted data'));
          }
          return { on: jest.fn() };
        }),
      });

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

      mockFfmpegInstance.pipe.mockReturnValue({
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('converted data'));
          }
          return { on: jest.fn() };
        }),
      });

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
    });

    it('should handle multiple data chunks', async () => {
      const chunk1 = Buffer.from('chunk1');
      const chunk2 = Buffer.from('chunk2');
      const chunk3 = Buffer.from('chunk3');

      mockFfmpegInstance.pipe.mockReturnValue({
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate multiple chunks
            callback(chunk1);
            callback(chunk2);
            callback(chunk3);
          }
          return { on: jest.fn() };
        }),
      });

      mockFfmpegInstance.on.mockImplementation((event: string, callback: any) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegInstance;
      });

      const result = await service.convertToMp3(mockFile);

      expect(result.buffer).toEqual(Buffer.concat([chunk1, chunk2, chunk3]));
    });


  });
});
