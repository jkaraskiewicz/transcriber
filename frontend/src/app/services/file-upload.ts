import { Injectable, signal } from '@angular/core';

const ALLOWED_AUDIO_TYPES = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/webm',
  'audio/ogg',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface FileValidationError {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  readonly uploadedFile = signal<File | null>(null);
  readonly uploadedFileUrl = signal<string>('');

  validateAndSetFile(file: File): FileValidationError | null {
    const typeError = this.validateFileType(file);
    if (typeError) {
      return typeError;
    }

    const sizeError = this.validateFileSize(file);
    if (sizeError) {
      return sizeError;
    }

    this.uploadedFile.set(file);
    const fileUrl = URL.createObjectURL(file);
    this.uploadedFileUrl.set(fileUrl);

    return null;
  }

  reset(): void {
    if (this.uploadedFileUrl()) {
      URL.revokeObjectURL(this.uploadedFileUrl());
    }
    this.uploadedFile.set(null);
    this.uploadedFileUrl.set('');
  }

  private validateFileType(file: File): FileValidationError | null {
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return {
        message: 'Invalid file type. Please upload a WAV, MP3, M4A, WebM, or OGG audio file.',
      };
    }
    return null;
  }

  private validateFileSize(file: File): FileValidationError | null {
    if (file.size > MAX_FILE_SIZE) {
      return {
        message: 'File is too large. Maximum size is 100MB.',
      };
    }
    return null;
  }
}
