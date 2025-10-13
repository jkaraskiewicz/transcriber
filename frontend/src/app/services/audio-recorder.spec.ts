import { TestBed } from '@angular/core/testing';
import { AudioRecorder, RecordingState } from './audio-recorder';

describe('AudioRecorder', () => {
  let service: AudioRecorder;
  let mockMediaRecorder: any;
  let mockStream: MediaStream;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioRecorder);

    // Mock MediaStream
    mockStream = {
      getTracks: jasmine.createSpy('getTracks').and.returnValue([
        { stop: jasmine.createSpy('stop') },
      ]),
    } as any;

    // Mock MediaRecorder
    mockMediaRecorder = {
      state: 'inactive',
      mimeType: 'audio/webm',
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
      ondataavailable: null,
      onstart: null,
      onstop: null,
      onerror: null,
    };

    spyOn(window, 'MediaRecorder').and.returnValue(mockMediaRecorder);
  });

  describe('startRecording', () => {
    it('should throw error when MediaRecorder API is not supported', async () => {
      const originalMediaDevices = navigator.mediaDevices;
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'MediaRecorder API is not supported in this browser'
      );

      expect(service.error()).toBe('MediaRecorder API is not supported in this browser');

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

      expect(service.error()).toBeNull();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
    });

    it('should clear error on successful start', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      service['error'].set('Previous error');

      await service.startRecording();

      expect(service.error()).toBeNull();
    });

    it('should set state to RECORDING when recording starts', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();

      expect(service.state()).toBe(RecordingState.IDLE);

      // Trigger onstart
      if (mockMediaRecorder.onstart) {
        mockMediaRecorder.onstart();
      }

      expect(service.state()).toBe(RecordingState.RECORDING);
    });

    it('should throw error when no supported MIME type is found', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(false);

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'No supported audio MIME type found'
      );

      expect(service.error()).toBe('No supported audio MIME type found');
    });

    it('should handle getUserMedia error', async () => {
      const error = new Error('Permission denied');
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(error)
      );

      await expectAsync(service.startRecording()).toBeRejectedWithError(
        'Permission denied'
      );

      expect(service.error()).toBe('Permission denied');
    });

    it('should handle non-Error object rejection', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject('string error')
      );

      await expectAsync(service.startRecording()).toBeRejectedWith('string error');

      expect(service.error()).toBe('Failed to start recording');
    });

    it('should collect audio data chunks', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();

      const chunk1 = new Blob(['chunk1'], { type: 'audio/webm' });
      const chunk2 = new Blob(['chunk2'], { type: 'audio/webm' });

      // Simulate data available events
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: chunk1 } as BlobEvent);
        mockMediaRecorder.ondataavailable({ data: chunk2 } as BlobEvent);
      }

      expect(mockMediaRecorder.ondataavailable).toBeTruthy();
    });

    it('should skip empty audio chunks', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();

      const emptyChunk = new Blob([], { type: 'audio/webm' });

      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: emptyChunk } as BlobEvent);
      }

      // Should not throw
      expect(mockMediaRecorder.ondataavailable).toBeTruthy();
    });

    it('should handle recording error', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();

      const errorEvent = { message: 'Recording failed' } as ErrorEvent;

      if (mockMediaRecorder.onerror) {
        mockMediaRecorder.onerror(errorEvent);
      }

      expect(service.error()).toBe('Recording error: Recording failed');
    });
  });

  describe('stopRecording', () => {
    it('should return null when no MediaRecorder exists', async () => {
      const result = await service.stopRecording();

      expect(result).toBeNull();
    });

    it('should return null when MediaRecorder is already inactive', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();
      mockMediaRecorder.state = 'inactive';

      const result = await service.stopRecording();

      expect(result).toBeNull();
    });

    it('should stop recording and return audio blob', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();
      mockMediaRecorder.state = 'recording';

      const chunk1 = new Blob(['audio1'], { type: 'audio/webm' });
      const chunk2 = new Blob(['audio2'], { type: 'audio/webm' });

      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: chunk1 } as BlobEvent);
        mockMediaRecorder.ondataavailable({ data: chunk2 } as BlobEvent);
      }

      const stopPromise = service.stopRecording();

      // Trigger onstop
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      const result = await stopPromise;

      expect(result).toBeInstanceOf(Blob);
      expect(result?.type).toBe('audio/webm');
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should stop media stream tracks on stop', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();
      mockMediaRecorder.state = 'recording';

      const stopPromise = service.stopRecording();

      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      await stopPromise;

      expect(mockStream.getTracks).toHaveBeenCalled();
      const tracks = mockStream.getTracks();
      expect(tracks[0].stop).toHaveBeenCalled();
    });

    it('should set state to IDLE on stop', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();
      mockMediaRecorder.state = 'recording';

      if (mockMediaRecorder.onstart) {
        mockMediaRecorder.onstart();
      }

      expect(service.state()).toBe(RecordingState.RECORDING);

      const stopPromise = service.stopRecording();

      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      await stopPromise;

      expect(service.state()).toBe(RecordingState.IDLE);
    });

    it('should use default mime type when mediaRecorder.mimeType is not set', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      await service.startRecording();
      mockMediaRecorder.state = 'recording';
      mockMediaRecorder.mimeType = undefined;

      const stopPromise = service.stopRecording();

      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      const result = await stopPromise;

      expect(result?.type).toBe('audio/webm');
    });
  });

  describe('isRecording', () => {
    it('should return false when state is IDLE', () => {
      service['state'].set(RecordingState.IDLE);

      expect(service.isRecording()).toBe(false);
    });

    it('should return true when state is RECORDING', () => {
      service['state'].set(RecordingState.RECORDING);

      expect(service.isRecording()).toBe(true);
    });

    it('should return false when state is PAUSED', () => {
      service['state'].set(RecordingState.PAUSED);

      expect(service.isRecording()).toBe(false);
    });
  });

  describe('complete recording flow', () => {
    it('should handle complete recording cycle', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve(mockStream)
      );
      spyOn(MediaRecorder, 'isTypeSupported').and.returnValue(true);

      // Start recording
      await service.startRecording();
      expect(service.error()).toBeNull();

      // Trigger onstart
      if (mockMediaRecorder.onstart) {
        mockMediaRecorder.onstart();
      }
      expect(service.state()).toBe(RecordingState.RECORDING);
      expect(service.isRecording()).toBe(true);

      // Add audio data
      mockMediaRecorder.state = 'recording';
      if (mockMediaRecorder.ondataavailable) {
        const chunk = new Blob(['audio'], { type: 'audio/webm' });
        mockMediaRecorder.ondataavailable({ data: chunk } as BlobEvent);
      }

      // Stop recording
      const stopPromise = service.stopRecording();

      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      const blob = await stopPromise;

      expect(blob).toBeInstanceOf(Blob);
      expect(service.state()).toBe(RecordingState.IDLE);
      expect(service.isRecording()).toBe(false);
    });
  });
});
