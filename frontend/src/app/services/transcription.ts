import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TranscriptionResponse {
  original: string;
  cleaned: string;
  intelligent?: string;
  message: string;
}

// Extend Window interface to include APP_CONFIG
declare global {
  interface Window {
    APP_CONFIG?: {
      apiUrl: string;
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class Transcription {
  private http = inject(HttpClient);
  // Use runtime config if available, otherwise fall back to environment
  private apiUrl = window.APP_CONFIG?.apiUrl || environment.apiUrl;

  transcribeAudio(audioBlob: Blob, filename: string): Observable<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    return this.http.post<TranscriptionResponse>(`${this.apiUrl}/transcribe`, formData);
  }

  cleanupText(text: string): Observable<TranscriptionResponse> {
    return this.http.post<TranscriptionResponse>(`${this.apiUrl}/cleanup-text`, { text });
  }

  checkHealth(): Observable<{ status: string; services: Record<string, string> }> {
    return this.http.get<{ status: string; services: Record<string, string> }>(
      `${this.apiUrl}/health`,
    );
  }
}
