import { Injectable, signal } from '@angular/core';

export interface RecordingState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string;
  recordingTime: number;
}

@Injectable({
  providedIn: 'root',
})
export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: number | null = null;

  readonly recordingTime = signal<number>(0);
  readonly audioBlob = signal<Blob | null>(null);
  readonly audioUrl = signal<string>('');

  async startRecording(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support microphone access. Please use a modern browser.');
    }

    const stream = await this.getUserMediaStream();
    const mimeType = this.getSupportedMimeType();

    if (!mimeType) {
      throw new Error('No supported audio format found');
    }

    this.initializeRecorder(stream, mimeType);
    this.mediaRecorder?.start(1000);
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  reset(): void {
    this.stopRecording();
    this.clearTimer();
    this.audioBlob.set(null);
    this.audioUrl.set('');
    this.recordingTime.set(0);
    this.audioChunks = [];
  }

  get formattedTime(): string {
    const seconds = this.recordingTime();
    const min = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  private async getUserMediaStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
    } catch (error) {
      throw this.createUserFriendlyError(error);
    }
  }

  private createUserFriendlyError(error: unknown): Error {
    if (!(error instanceof Error)) {
      return new Error('An error occurred while accessing the microphone.');
    }

    const errorName = error.name;

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return new Error(
        'Microphone access was denied. Please check your browser permissions and try again.'
      );
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return new Error(`No microphone detected.

Please:
1. Connect a microphone or headset
2. Check System Settings → Privacy & Security → Microphone
3. Ensure your browser has microphone access
4. Refresh the page after connecting a device`);
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return new Error(
        'Microphone is already in use by another application. Please close other apps and try again.'
      );
    }

    if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
      return new Error(
        'Your microphone does not meet the required specifications. Try using a different microphone.'
      );
    }

    if (errorName === 'NotSupportedError') {
      return new Error(
        'Microphone access is not supported in this context. Make sure you are using HTTPS or localhost.'
      );
    }

    if (errorName === 'TypeError') {
      return new Error('Invalid microphone configuration. Please contact support.');
    }

    return new Error(`An error occurred while accessing the microphone: ${error.message}`);
  }

  private initializeRecorder(stream: MediaStream, mimeType: string): void {
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.audioChunks = [];
    this.recordingTime.set(0);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstart = () => {
      this.startTimer();
    };

    this.mediaRecorder.onstop = () => {
      this.clearTimer();
      stream.getTracks().forEach((track) => track.stop());

      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      this.audioBlob.set(audioBlob);
      this.audioUrl.set(audioUrl);
      this.audioChunks = [];
    };
  }

  private startTimer(): void {
    this.clearTimer();
    this.timerInterval = window.setInterval(() => {
      this.recordingTime.update((time) => time + 1);
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private getSupportedMimeType(): string | null {
    const types = ['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || null;
  }
}
