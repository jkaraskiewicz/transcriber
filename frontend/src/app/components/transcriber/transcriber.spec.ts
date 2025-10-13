import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Transcriber } from './transcriber';
import { AudioRecorder } from '../../services/audio-recorder';
import { Transcription, TranscriptionResponse } from '../../services/transcription';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Transcriber', () => {
  let component: Transcriber;
  let fixture: ComponentFixture<Transcriber>;
  let mockAudioRecorder: jasmine.SpyObj<AudioRecorder>;
  let mockTranscriptionService: jasmine.SpyObj<Transcription>;

  const mockTranscriptionResponse: TranscriptionResponse = {
    original: 'original text',
    cleaned: 'cleaned text',
    intelligent: 'intelligent text',
    message: 'Success',
  };

  beforeEach(async () => {
    mockAudioRecorder = jasmine.createSpyObj('AudioRecorder', ['startRecording', 'stopRecording']);
    mockTranscriptionService = jasmine.createSpyObj('Transcription', [
      'transcribeAudio',
      'cleanupText',
    ]);

    await TestBed.configureTestingModule({
      imports: [Transcriber],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AudioRecorder, useValue: mockAudioRecorder },
        { provide: Transcription, useValue: mockTranscriptionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Transcriber);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('State Transitions', () => {
    it('should start in START state', () => {
      expect(component.currentState()).toBe('start');
    });

    it('should transition to CHOICE state on start click', () => {
      component.onStartClick();
      expect(component.currentState()).toBe('choice');
    });

    it('should transition to TYPE_INPUT state when choosing type', () => {
      component.onChooseType();
      expect(component.currentState()).toBe('type-input');
    });

    it('should transition to UPLOAD_INPUT state when choosing upload', () => {
      component.onChooseUpload();
      expect(component.currentState()).toBe('upload-input');
    });

    it('should reset to START state', () => {
      component.onStartClick();
      component.onChooseType();
      component.onReset();
      expect(component.currentState()).toBe('start');
    });
  });

  describe('Text Processing', () => {
    beforeEach(() => {
      mockTranscriptionService.cleanupText.and.returnValue(of(mockTranscriptionResponse));
    });

    it('should not process empty text', () => {
      component.textInput.set('');
      component.onProcessText();
      expect(mockTranscriptionService.cleanupText).not.toHaveBeenCalled();
    });

    it('should process text and transition to OUTPUT state', () => {
      component.textInput.set('test input');
      component.onProcessText();
      expect(component.currentState()).toBe('output');
      expect(component.isProcessing()).toBe(true);
    });

    it('should update output after successful text processing', (done) => {
      component.textInput.set('test input');
      component.onProcessText();

      setTimeout(() => {
        expect(component.inputText()).toBe('original text');
        expect(component.outputText()).toBe('cleaned text');
        expect(component.intelligentText()).toBe('intelligent text');
        expect(component.isProcessing()).toBe(false);
        done();
      }, 2100);
    });

    it('should handle text processing error', (done) => {
      mockTranscriptionService.cleanupText.and.returnValue(
        throwError(() => new Error('API Error'))
      );
      component.textInput.set('test input');
      component.onProcessText();

      setTimeout(() => {
        expect(component.outputText()).toContain('Error processing text');
        expect(component.isProcessing()).toBe(false);
        done();
      }, 2100);
    });
  });

  describe('File Upload', () => {
    let mockFile: File;

    beforeEach(() => {
      mockFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      mockTranscriptionService.transcribeAudio.and.returnValue(of(mockTranscriptionResponse));
    });

    it('should accept valid audio file', () => {
      const event = {
        target: { files: [mockFile] } as unknown as HTMLInputElement,
      } as unknown as Event;

      spyOn(window, 'alert');
      component.onFileSelected(event);

      expect(component.uploadedFile()).toBe(mockFile);
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should reject invalid file type', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: { files: [invalidFile] } as unknown as HTMLInputElement,
      } as unknown as Event;

      spyOn(window, 'alert');
      component.onFileSelected(event);

      expect(component.uploadedFile()).toBeNull();
      expect(window.alert).toHaveBeenCalledWith(
        jasmine.stringContaining('Invalid file type')
      );
    });

    it('should reject file larger than 100MB', () => {
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.mp3', {
        type: 'audio/mpeg',
      });
      const event = {
        target: { files: [largeFile] } as unknown as HTMLInputElement,
      } as unknown as Event;

      spyOn(window, 'alert');
      component.onFileSelected(event);

      expect(component.uploadedFile()).toBeNull();
      expect(window.alert).toHaveBeenCalledWith(jasmine.stringContaining('too large'));
    });

    it('should process uploaded file', () => {
      component.uploadedFile.set(mockFile);
      component.onProcessUploadedFile();

      expect(component.currentState()).toBe('output');
      expect(mockTranscriptionService.transcribeAudio).toHaveBeenCalledWith(
        mockFile,
        'test.mp3'
      );
    });

    it('should not process if no file uploaded', () => {
      component.uploadedFile.set(null);
      component.onProcessUploadedFile();

      expect(mockTranscriptionService.transcribeAudio).not.toHaveBeenCalled();
    });
  });

  describe('Audio Recording', () => {
    it('should not process audio if no blob exists', () => {
      component.audioBlob.set(null);
      component.onProcessAudio();

      expect(mockTranscriptionService.transcribeAudio).not.toHaveBeenCalled();
    });

    it('should process audio blob when available', () => {
      mockTranscriptionService.transcribeAudio.and.returnValue(of(mockTranscriptionResponse));
      const mockBlob = new Blob(['audio'], { type: 'audio/webm' });
      component.audioBlob.set(mockBlob);

      component.onProcessAudio();

      expect(component.currentState()).toBe('output');
      expect(mockTranscriptionService.transcribeAudio).toHaveBeenCalled();
    });
  });

  describe('Output Tabs', () => {
    it('should start with clean tab active', () => {
      expect(component.activeTab()).toBe('clean');
    });

    it('should switch to intelligent tab', () => {
      component.onTabChange('intelligent');
      expect(component.activeTab()).toBe('intelligent');
    });

    it('should reset copied state when changing tabs', () => {
      component.isCopied.set(true);
      component.onTabChange('intelligent');
      expect(component.isCopied()).toBe(false);
    });
  });

  describe('Copy to Clipboard', () => {
    beforeEach(() => {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    });

    it('should not copy if output is empty', async () => {
      component.outputText.set('');
      await component.onCopyOutput();
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('should copy clean tab text', async () => {
      component.outputText.set('clean text');
      component.activeTab.set('clean');
      await component.onCopyOutput();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('clean text');
      expect(component.isCopied()).toBe(true);
    });

    it('should copy intelligent tab text', async () => {
      component.intelligentText.set('intelligent text');
      component.activeTab.set('intelligent');
      await component.onCopyOutput();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('intelligent text');
      expect(component.isCopied()).toBe(true);
    });

    it('should reset copied state after 2 seconds', (done) => {
      component.outputText.set('test');
      component.onCopyOutput();

      setTimeout(() => {
        expect(component.isCopied()).toBe(false);
        done();
      }, 2100);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state', () => {
      component.textInput.set('text');
      component.inputText.set('input');
      component.outputText.set('output');
      component.intelligentText.set('intelligent');
      component.activeTab.set('intelligent');
      component.isCopied.set(true);
      component.isProcessing.set(true);

      component.onReset();

      expect(component.textInput()).toBe('');
      expect(component.inputText()).toBe('');
      expect(component.outputText()).toBe('');
      expect(component.intelligentText()).toBe('');
      expect(component.activeTab()).toBe('clean');
      expect(component.isCopied()).toBe(false);
      expect(component.isProcessing()).toBe(false);
      expect(component.currentState()).toBe('start');
    });

    it('should clear uploaded file on reset', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      component.uploadedFile.set(mockFile);
      component.uploadedFileUrl.set('blob:url');

      component.onReset();

      expect(component.uploadedFile()).toBeNull();
      expect(component.uploadedFileUrl()).toBe('');
    });
  });

  describe('Helper Methods', () => {
    it('should show reset button when not in START state', () => {
      component.onStartClick();
      expect(component.showResetButton).toBe(true);
    });

    it('should not show reset button in START state', () => {
      expect(component.showResetButton).toBe(false);
    });

    it('should enable text processing when input is not empty', () => {
      component.textInput.set('some text');
      expect(component.canProcessText).toBe(true);
    });

    it('should disable text processing when input is empty', () => {
      component.textInput.set('   ');
      expect(component.canProcessText).toBe(false);
    });

    it('should format recording time correctly', () => {
      component.recordingTime.set(0);
      expect(component.formattedTime()).toBe('00:00');

      component.recordingTime.set(65);
      expect(component.formattedTime()).toBe('01:05');

      component.recordingTime.set(125);
      expect(component.formattedTime()).toBe('02:05');
    });
  });
});
