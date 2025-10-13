import { TestBed } from '@angular/core/testing';
import { FileUploadService } from './file-upload';

describe('FileUploadService', () => {
  let service: FileUploadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileUploadService);
  });

  afterEach(() => {
    service.reset();
  });

  describe('validateAndSetFile', () => {
    it('should accept WAV files', () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
      expect(service.uploadedFileUrl()).toBeTruthy();
    });

    it('should accept MP3 files', () => {
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
    });

    it('should accept MP4 audio files', () => {
      const mockFile = new File(['audio data'], 'test.mp4', { type: 'audio/mp4' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
    });

    it('should accept M4A files', () => {
      const mockFile = new File(['audio data'], 'test.m4a', { type: 'audio/m4a' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
    });

    it('should accept x-m4a files', () => {
      const mockFile = new File(['audio data'], 'test.m4a', { type: 'audio/x-m4a' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
    });

    it('should accept WebM files', () => {
      const mockFile = new File(['audio data'], 'test.webm', { type: 'audio/webm' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
    });

    it('should accept OGG files', () => {
      const mockFile = new File(['audio data'], 'test.ogg', { type: 'audio/ogg' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
    });

    it('should reject invalid file types', () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).not.toBeNull();
      expect(error?.message).toBe(
        'Invalid file type. Please upload a WAV, MP3, M4A, WebM, or OGG audio file.'
      );
      expect(service.uploadedFile()).toBeNull();
    });

    it('should reject text files', () => {
      const mockFile = new File(['text'], 'test.txt', { type: 'text/plain' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('Invalid file type');
    });

    it('should reject files larger than 100MB', () => {
      const largeSize = 101 * 1024 * 1024; // 101MB
      const mockFile = new File(['x'.repeat(largeSize)], 'large.wav', {
        type: 'audio/wav',
      });

      Object.defineProperty(mockFile, 'size', { value: largeSize });

      const error = service.validateAndSetFile(mockFile);

      expect(error).not.toBeNull();
      expect(error?.message).toBe('File is too large. Maximum size is 100MB.');
      expect(service.uploadedFile()).toBeNull();
    });

    it('should accept files at exactly 100MB', () => {
      const maxSize = 100 * 1024 * 1024; // 100MB
      const mockFile = new File(['x'.repeat(1000)], 'max.wav', {
        type: 'audio/wav',
      });

      Object.defineProperty(mockFile, 'size', { value: maxSize });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
    });

    it('should accept small files', () => {
      const mockFile = new File(['small'], 'small.mp3', { type: 'audio/mpeg' });

      const error = service.validateAndSetFile(mockFile);

      expect(error).toBeNull();
      expect(service.uploadedFile()).toBe(mockFile);
    });

    it('should create object URL for valid file', () => {
      spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
      const mockFile = new File(['audio'], 'test.wav', { type: 'audio/wav' });

      service.validateAndSetFile(mockFile);

      expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
      expect(service.uploadedFileUrl()).toBe('blob:mock-url');
    });

    it('should not create object URL for invalid file', () => {
      spyOn(URL, 'createObjectURL');
      const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' });

      service.validateAndSetFile(mockFile);

      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(service.uploadedFileUrl()).toBe('');
    });
  });

  describe('reset', () => {
    it('should clear uploaded file and URL', () => {
      const mockFile = new File(['audio'], 'test.wav', { type: 'audio/wav' });
      service.validateAndSetFile(mockFile);

      service.reset();

      expect(service.uploadedFile()).toBeNull();
      expect(service.uploadedFileUrl()).toBe('');
    });

    it('should revoke object URL on reset', () => {
      spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(URL, 'revokeObjectURL');

      const mockFile = new File(['audio'], 'test.wav', { type: 'audio/wav' });
      service.validateAndSetFile(mockFile);

      service.reset();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle reset when no file is uploaded', () => {
      expect(() => service.reset()).not.toThrow();
      expect(service.uploadedFile()).toBeNull();
      expect(service.uploadedFileUrl()).toBe('');
    });

    it('should not revoke URL when none exists', () => {
      spyOn(URL, 'revokeObjectURL');

      service.reset();

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('multiple file validation', () => {
    it('should replace previous file when new file is validated', () => {
      const file1 = new File(['audio1'], 'test1.wav', { type: 'audio/wav' });
      const file2 = new File(['audio2'], 'test2.mp3', { type: 'audio/mpeg' });

      service.validateAndSetFile(file1);
      const firstFile = service.uploadedFile();

      service.validateAndSetFile(file2);
      const secondFile = service.uploadedFile();

      expect(firstFile).toBe(file1);
      expect(secondFile).toBe(file2);
      expect(secondFile).not.toBe(firstFile);
    });

    it('should not replace file when new validation fails', () => {
      const validFile = new File(['audio'], 'test.wav', { type: 'audio/wav' });
      const invalidFile = new File(['video'], 'test.mp4', { type: 'video/mp4' });

      service.validateAndSetFile(validFile);
      const error = service.validateAndSetFile(invalidFile);

      expect(error).not.toBeNull();
      expect(service.uploadedFile()).toBe(validFile);
    });
  });
});
