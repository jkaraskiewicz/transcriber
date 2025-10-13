import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Transcription, TranscriptionResponse } from '../../services/transcription';
import { RecordingService } from '../../services/recording';
import { FileUploadService } from '../../services/file-upload';

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
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transcriber.html',
  styleUrls: ['./transcriber.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Transcriber {
  private transcriptionService = inject(Transcription);
  private recordingService = inject(RecordingService);
  private fileUploadService = inject(FileUploadService);

  readonly currentState = signal<AppState>(AppState.START);
  readonly speakView = signal<SpeakView>(SpeakView.RECORDER);
  readonly textInput = signal<string>('');
  readonly isProcessing = signal<boolean>(false);
  readonly inputText = signal<string>('');
  readonly outputText = signal<string>('');
  readonly intelligentText = signal<string>('');
  readonly activeTab = signal<'clean' | 'intelligent'>('clean');
  readonly isCopied = signal<boolean>(false);

  readonly AppState = AppState;
  readonly SpeakView = SpeakView;

  // Expose recording service signals
  readonly recordingTime = this.recordingService.recordingTime;
  readonly audioBlob = this.recordingService.audioBlob;
  readonly audioUrl = this.recordingService.audioUrl;
  readonly formattedTime = computed(() => this.recordingService.formattedTime);

  // Expose file upload service signals
  readonly uploadedFile = this.fileUploadService.uploadedFile;
  readonly uploadedFileUrl = this.fileUploadService.uploadedFileUrl;

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
    try {
      await this.recordingService.startRecording();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start recording';
      alert(message);
      this.onReset();
    }
  }

  onChooseUpload(): void {
    this.transitionTo(AppState.UPLOAD_INPUT);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const error = this.fileUploadService.validateAndSetFile(file);

    if (error) {
      alert(error.message);
    }
  }

  onProcessText(): void {
    const text = this.textInput().trim();
    if (!text) {
      return;
    }

    this.processWithTranscription(() => this.transcriptionService.cleanupText(text));
  }

  onStopRecording(): void {
    this.recordingService.stopRecording();
    this.speakView.set(SpeakView.PLAYBACK);
  }

  onProcessAudio(): void {
    const blob = this.audioBlob();
    if (!blob) {
      return;
    }

    const filename = `recording_${Date.now()}.webm`;
    this.processWithTranscription(() =>
      this.transcriptionService.transcribeAudio(blob, filename)
    );
  }

  onProcessUploadedFile(): void {
    const file = this.uploadedFile();
    if (!file) {
      return;
    }

    this.processWithTranscription(() =>
      this.transcriptionService.transcribeAudio(file, file.name)
    );
  }

  async onCopyOutput(): Promise<void> {
    const text = this.activeTab() === 'clean' ? this.outputText() : this.intelligentText();
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.isCopied.set(true);
      setTimeout(() => {
        this.isCopied.set(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }

  onTabChange(tab: 'clean' | 'intelligent'): void {
    this.activeTab.set(tab);
    this.isCopied.set(false);
  }

  onReset(): void {
    this.recordingService.reset();
    this.fileUploadService.reset();
    this.textInput.set('');
    this.inputText.set('');
    this.outputText.set('');
    this.intelligentText.set('');
    this.activeTab.set('clean');
    this.isCopied.set(false);
    this.speakView.set(SpeakView.RECORDER);
    this.isProcessing.set(false);
    this.transitionTo(AppState.START);
  }

  private processWithTranscription(
    transcriptionFn: () => ReturnType<typeof this.transcriptionService.cleanupText>
  ): void {
    this.transitionTo(AppState.OUTPUT);
    this.isProcessing.set(true);

    transcriptionFn().subscribe({
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
          this.outputText.set('Error processing. Please try again.');
          this.intelligentText.set('');
        }, 2000);
      },
    });
  }

  private transitionTo(state: AppState): void {
    this.currentState.set(state);
  }
}
