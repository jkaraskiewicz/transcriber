import { Injectable, signal } from '@angular/core';

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
}

@Injectable({
  providedIn: 'root',
})
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  readonly state = signal<RecordingState>(RecordingState.IDLE);
  readonly error = signal<string | null>(null);

  async startRecording(): Promise<void> {
    try {
      this.error.set(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaRecorder API is not supported in this browser');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mimeType = this.getSupportedMimeType();
      if (!mimeType) {
        throw new Error('No supported audio MIME type found');
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.state.set(RecordingState.RECORDING);
      };

      this.mediaRecorder.onstop = () => {
        this.state.set(RecordingState.IDLE);
        this.stream?.getTracks().forEach((track) => track.stop());
      };

      this.mediaRecorder.onerror = (event: Event) => {
        this.error.set(`Recording error: ${(event as ErrorEvent).message}`);
        this.stopRecording();
      };

      this.mediaRecorder.start(1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      this.error.set(errorMessage);
      throw err;
    }
  }

  async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }

    return new Promise<Blob>((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }

      this.mediaRecorder.onstop = () => {
        this.state.set(RecordingState.IDLE);
        this.stream?.getTracks().forEach((track) => track.stop());

        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.audioChunks = [];
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private getSupportedMimeType(): string | null {
    const types = ['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || null;
  }

  isRecording(): boolean {
    return this.state() === RecordingState.RECORDING;
  }
}
