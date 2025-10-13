import { TestBed } from '@angular/core/testing';
import { RecordingService } from './recording';

describe('RecordingService', () => {
  let service: RecordingService;
  let mockMediaRecorder: any;
  let mockStream: MediaStream;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecordingService);

    // Mock MediaStream
    mockStream = {
      getTracks: jasmine.createSpy('getTracks').and.returnValue([
        { stop: jasmine.createSpy('stop') },
      ]),
    } as any;

    // Mock MediaRecorder
    mockMediaRecorder = {
      state: 'inactive',
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
      ondataavailable: null,
      onstart: null,
      onstop: null,
    };

    spyOn(window, 'MediaRecorder').and.returnValue(mockMediaRecorder);
  });

  afterEach(() => {
    service.reset();
  });

  describe('startRecording', () => {
    it('should throw error when getUserMedia is not supported', async () => {
      const originalMediaDevices = navigator.mediaDevices;
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'Your browser does not support microphone access. Please use a modern browser.'
      );

      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        writable: true,
        configurable: true,
      });
    });

    it('should start recording successfully', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
    });

    it('should throw error when no supported mime type is found', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(false);

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'No supported audio format found'
      );
    });

    it('should handle NotAllowedError with user-friendly message', async () => {
      const error = new Error('Permission denied');
      (error as any).name = 'NotAllowedError';
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(error)
      );

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'Microphone access was denied. Please check your browser permissions and try again.'
      );
    });

    it('should handle NotFoundError with user-friendly message', async () => {
      const error = new Error('No device found');
      (error as any).name = 'NotFoundError';
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(error)
      );

      await expectAsync(service.startRecording()).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringContaining('No microphone detected'),
        })
      );
    });

    it('should handle NotReadableError with user-friendly message', async () => {
      const error = new Error('Device in use');
      (error as any).name = 'NotReadableError';
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(error)
      );

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'Microphone is already in use by another application. Please close other apps and try again.'
      );
    });

    it('should handle OverconstrainedError with user-friendly message', async () => {
      const error = new Error('Constraints not satisfied');
      (error as any).name = 'OverconstrainedError';
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(error)
      );

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'Your microphone does not meet the required specifications. Try using a different microphone.'
      );
    });

    it('should handle NotSupportedError with user-friendly message', async () => {
      const error = new Error('Not supported');
      (error as any).name = 'NotSupportedError';
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(error)
      );

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'Microphone access is not supported in this context. Make sure you are using HTTPS or localhost.'
      );
    });

    it('should handle TypeError with user-friendly message', async () => {
      const error = new TypeError('Invalid config');
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(error)
      );

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'Invalid microphone configuration. Please contact support.'
      );
    });

    it('should handle generic error with original message', async () => {
      const error = new Error('Some other error');
      (error as any).name = 'UnknownError';
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(error)
      );

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'An error occurred while accessing the microphone: Some other error'
      );
    });
  });

  describe('stopRecording', () => {
    it('should stop recording when active', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();
      mockMediaRecorder.state = 'recording';

      service.stopRecording();

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should not stop recording when already inactive', () => {
      mockMediaRecorder.state = 'inactive';

      service.stopRecording();

      expect(mockMediaRecorder.stop).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      service.audioBlob.set(new Blob());
      service.audioUrl.set('blob:test');
      service.recordingTime.set(30);

      service.reset();

      expect(service.audioBlob()).toBeNull();
      expect(service.audioUrl()).toBe('');
      expect(service.recordingTime()).toBe(0);
    });
  });

  describe('formattedTime', () => {
    it('should format 0 seconds correctly', () => {
      service.recordingTime.set(0);
      expect(service.formattedTime).toBe('00:00');
    });

    it('should format 59 seconds correctly', () => {
      service.recordingTime.set(59);
      expect(service.formattedTime).toBe('00:59');
    });

    it('should format 1 minute correctly', () => {
      service.recordingTime.set(60);
      expect(service.formattedTime).toBe('01:00');
    });

    it('should format 5 minutes 23 seconds correctly', () => {
      service.recordingTime.set(323);
      expect(service.formattedTime).toBe('05:23');
    });

    it('should format 10 minutes correctly', () => {
      service.recordingTime.set(600);
      expect(service.formattedTime).toBe('10:00');
    });
  });

  describe('recording flow', () => {
    it('should handle complete recording flow with data chunks', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();

      // Simulate data chunks
      const chunk1 = new Blob(['chunk1'], { type: 'audio/webm' });
      const chunk2 = new Blob(['chunk2'], { type: 'audio/webm' });

      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: chunk1 });
        mockMediaRecorder.ondataavailable({ data: chunk2 });
      }

      // Simulate stop
      mockMediaRecorder.state = 'inactive';
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      expect(service.audioBlob()).toBeTruthy();
      expect(service.audioUrl()).toBeTruthy();
    });

    it('should skip empty data chunks', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();

      const emptyChunk = new Blob([], { type: 'audio/webm' });
      const validChunk = new Blob(['data'], { type: 'audio/webm' });

      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: emptyChunk });
        mockMediaRecorder.ondataavailable({ data: validChunk });
      }

      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      expect(service.audioBlob()).toBeTruthy();
    });
  });
});
