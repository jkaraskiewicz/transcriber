import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioRecorder } from '../../services/audio-recorder';
import { Transcription, TranscriptionResponse } from '../../services/transcription';

enum AppState {
  START = 'start',
  CHOICE = 'choice',
  TYPE_INPUT = 'type-input',
  SPEAK_INPUT = 'speak-input',
  UPLOAD_INPUT = 'upload-input',
  OUTPUT = 'output',
}

enum SpeakView {
  RECORDER = 'recorder',
  PLAYBACK = 'playback',
}

@Component({
  selector: 'app-transcriber',
  imports: [CommonModule, FormsModule],
  templateUrl: './transcriber.html',
  styleUrl: './transcriber.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Transcriber {
  private audioRecorder = inject(AudioRecorder);
  private transcriptionService = inject(Transcription);

  readonly currentState = signal<AppState>(AppState.START);
  readonly speakView = signal<SpeakView>(SpeakView.RECORDER);
  readonly textInput = signal<string>('');
  readonly isProcessing = signal<boolean>(false);
  readonly inputText = signal<string>(''); // Original/raw text before Gemini processing
  readonly outputText = signal<string>(''); // Cleaned text after Gemini processing
  readonly intelligentText = signal<string>(''); // Intelligently corrected text
  readonly activeTab = signal<'clean' | 'intelligent'>('clean'); // Active output tab
  readonly audioBlob = signal<Blob | null>(null);
  readonly audioUrl = signal<string>('');
  readonly recordingTime = signal<number>(0);
  readonly isCopied = signal<boolean>(false);
  readonly uploadedFile = signal<File | null>(null);
  readonly uploadedFileUrl = signal<string>('');

  private timerInterval: number | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  readonly AppState = AppState;
  readonly SpeakView = SpeakView;

  get showResetButton(): boolean {
    return this.currentState() !== AppState.START;
  }

  get canProcessText(): boolean {
    return this.textInput().trim().length > 0;
  }

  onStartClick(): void {
    this.transitionTo(AppState.CHOICE);
  }

  onChooseType(): void {
    this.transitionTo(AppState.TYPE_INPUT);
  }

  async onChooseSpeak(): Promise<void> {
    this.transitionTo(AppState.SPEAK_INPUT);
    await this.startRecording();
  }

  onChooseUpload(): void {
    this.transitionTo(AppState.UPLOAD_INPUT);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/webm', 'audio/ogg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload a WAV, MP3, M4A, WebM, or OGG audio file.');
        return;
      }

      // Validate file size (100MB max)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 100MB.');
        return;
      }

      this.uploadedFile.set(file);
      const fileUrl = URL.createObjectURL(file);
      this.uploadedFileUrl.set(fileUrl);
    }
  }

  onProcessUploadedFile(): void {
    const file = this.uploadedFile();
    if (!file) {
      return;
    }

    this.transitionTo(AppState.OUTPUT);
    this.isProcessing.set(true);

    this.transcriptionService.transcribeAudio(file, file.name).subscribe({
      next: (result: TranscriptionResponse) => {
        setTimeout(() => {
          this.isProcessing.set(false);
          this.inputText.set(result.original);
          this.outputText.set(result.cleaned);
          this.intelligentText.set(result.intelligent || result.cleaned);
        }, 2000);
      },
      error: () => {
        setTimeout(() => {
          this.isProcessing.set(false);
          this.inputText.set('');
          this.outputText.set('Error processing audio file. Please try again.');
          this.intelligentText.set('');
        }, 2000);
      },
    });
  }

  onProcessText(): void {
    const text = this.textInput().trim();
    if (!text) {
      return;
    }

    this.transitionTo(AppState.OUTPUT);
    this.isProcessing.set(true);

    this.transcriptionService.cleanupText(text).subscribe({
      next: (result: TranscriptionResponse) => {
        setTimeout(() => {
          this.isProcessing.set(false);
          this.inputText.set(result.original);
          this.outputText.set(result.cleaned);
          this.intelligentText.set(result.intelligent || result.cleaned);
        }, 2000);
      },
      error: () => {
        setTimeout(() => {
          this.isProcessing.set(false);
          this.inputText.set('');
          this.outputText.set('Error processing text. Please try again.');
          this.intelligentText.set('');
        }, 2000);
      },
    });
  }

  onStopRecording(): void {
    this.stopRecording();
  }

  onProcessAudio(): void {
    const blob = this.audioBlob();
    if (!blob) {
      return;
    }

    this.transitionTo(AppState.OUTPUT);
    this.isProcessing.set(true);

    const filename = `recording_${Date.now()}.webm`;

    this.transcriptionService.transcribeAudio(blob, filename).subscribe({
      next: (result: TranscriptionResponse) => {
        setTimeout(() => {
          this.isProcessing.set(false);
          this.inputText.set(result.original);
          this.outputText.set(result.cleaned);
          this.intelligentText.set(result.intelligent || result.cleaned);
        }, 2000);
      },
      error: () => {
        setTimeout(() => {
          this.isProcessing.set(false);
          this.inputText.set('');
          this.outputText.set('Error processing audio. Please try again.');
          this.intelligentText.set('');
        }, 2000);
      },
    });
  }

  async onCopyOutput(): Promise<void> {
    const text = this.activeTab() === 'clean' ? this.outputText() : this.intelligentText();
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.isCopied.set(true);

      // Reset after 2 seconds
      setTimeout(() => {
        this.isCopied.set(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }

  onTabChange(tab: 'clean' | 'intelligent'): void {
    this.activeTab.set(tab);
    this.isCopied.set(false); // Reset copy state when switching tabs
  }

  onReset(): void {
    this.stopRecording();
    this.clearTimer();
    this.textInput.set('');
    this.inputText.set('');
    this.outputText.set('');
    this.intelligentText.set('');
    this.activeTab.set('clean');
    this.audioBlob.set(null);
    this.audioUrl.set('');
    this.recordingTime.set(0);
    this.isCopied.set(false);
    this.speakView.set(SpeakView.RECORDER);
    this.isProcessing.set(false);
    this.uploadedFile.set(null);
    this.uploadedFileUrl.set('');
    this.transitionTo(AppState.START);
  }

  private transitionTo(state: AppState): void {
    this.currentState.set(state);
  }

  private async startRecording(): Promise<void> {
    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support microphone access. Please use a modern browser.');
      console.error('getUserMedia not supported');
      this.onReset();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mimeType = this.getSupportedMimeType();
      if (!mimeType) {
        alert('No supported audio format found');
        this.onReset();
        return;
      }

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
        this.speakView.set(SpeakView.PLAYBACK);
        this.audioChunks = [];
      };

      this.mediaRecorder.start(1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'An error occurred while accessing the microphone.';
      
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone access was denied. Please check your browser permissions and try again.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = `No microphone detected.

Please:
1. Connect a microphone or headset
2. Check System Settings → Privacy & Security → Microphone
3. Ensure your browser has microphone access
4. Refresh the page after connecting a device`;
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Microphone is already in use by another application. Please close other apps and try again.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          errorMessage = 'Your microphone does not meet the required specifications. Try using a different microphone.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Microphone access is not supported in this context. Make sure you are using HTTPS or localhost.';
        } else if (error.name === 'TypeError') {
          errorMessage = 'Invalid microphone configuration. Please contact support.';
        }
      }
      
      alert(errorMessage);
      this.onReset();
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
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

  get formattedTime(): string {
    const seconds = this.recordingTime();
    const min = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }
}
