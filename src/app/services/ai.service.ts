import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

export interface AiAskResult {
  text: string;
  raw: unknown;
}

type AiStreamPayload =
  | string
  | {
      token?: unknown;
      text?: unknown;
      content?: unknown;
      delta?: unknown;
      data?: unknown;
      message?: unknown;
      answer?: unknown;
      result?: unknown;
    };

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly productionApiUrl = 'https://webservices-rqvr.onrender.com';

  constructor(private http: HttpClient) {}

  askLegacy(question: string): Observable<AiAskResult> {
    return new Observable<AiAskResult>((observer) => {
      const urls = this.apiBaseUrls();

      const runRequest = (index: number): void => {
        this.http.post<unknown>(`${urls[index]}/ai/ask`, { question }).subscribe({
          next: (response) => {
            observer.next({
              text: this.extractText(response),
              raw: response,
            });
            observer.complete();
          },
          error: (error) => {
            if (index < urls.length - 1) {
              runRequest(index + 1);
              return;
            }

            observer.error(error);
          },
        });
      };

      runRequest(0);
    });
  }

  askStream(question: string): Observable<string> {
    return new Observable<string>((observer) => {
      const urls = this.apiBaseUrls();
      let eventSource: EventSource | null = null;
      let streamedAnyToken = false;

      const connect = (index: number): void => {
        eventSource?.close();
        eventSource = new EventSource(
          `${urls[index]}/ai/ask?question=${encodeURIComponent(question)}`,
        );

        eventSource.onmessage = (event) => {
          if (event.data === '[DONE]') {
            observer.complete();
            eventSource?.close();
            return;
          }

          try {
            const payload = JSON.parse(event.data) as AiStreamPayload;
            const token = this.extractText(payload);

            if (token) {
              streamedAnyToken = true;
              observer.next(token);
              return;
            }

            if (typeof payload === 'string' && payload.trim()) {
              streamedAnyToken = true;
              observer.next(payload);
              return;
            }

            observer.error(new Error('Stream payload did not contain text.'));
          } catch (error) {
            if (typeof event.data === 'string' && event.data.trim()) {
              streamedAnyToken = true;
              observer.next(event.data);
            } else {
              observer.error(error);
              eventSource?.close();
            }
          }
        };

        eventSource.onerror = (err) => {
          eventSource?.close();

          if (!streamedAnyToken && index < urls.length - 1) {
            connect(index + 1);
            return;
          }

          observer.error(err);
        };
      };

      connect(0);

      return () => {
        eventSource?.close();
      };
    });
  }

  ask(question: string): Observable<AiAskResult> {
    return new Observable<AiAskResult>((observer) => {
      const urls = this.apiBaseUrls();

      const runRequest = (index: number): void => {
        this.http
          .post<unknown>(`${urls[index]}/ai/v2/ask`, { message: question })
          .subscribe({
            next: (response) => {
              const text = this.extractText(response);

              observer.next({
                text,
                raw: response,
              });
              observer.complete();
            },
            error: (error) => {
              if (index < urls.length - 1) {
                runRequest(index + 1);
                return;
              }

              observer.error(error);
            },
          });
      };

      runRequest(0);
    });
  }

  private apiBaseUrls(): string[] {
    if (environment.production || environment.API_URL === this.productionApiUrl) {
      return [environment.API_URL];
    }

    return [environment.API_URL, this.productionApiUrl];
  }

  private extractText(payload: unknown): string {
    if (typeof payload === 'string') {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return '';
    }

    const record = payload as Record<string, unknown>;
    const candidateKeys = [
      'token',
      'text',
      'content',
      'delta',
      'data',
      'message',
      'answer',
      'result',
    ];

    for (const key of candidateKeys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }

      if (value && typeof value === 'object') {
        const nestedText = this.extractText(value);
        if (nestedText) {
          return nestedText;
        }
      }
    }

    return '';
  }
}
