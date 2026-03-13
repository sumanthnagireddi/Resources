import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  constructor() {}
  // rag.service.ts
  askStream(question: string): Observable<string> {
    return new Observable((observer) => {
      const eventSource = new EventSource(
        `${environment.API_URL}/ai/ask?question=${encodeURIComponent(question)}`,
      );

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          observer.complete();
          eventSource.close();
          return;
        }
        const { token } = JSON.parse(event.data);
        observer.next(token);
      };

      eventSource.onerror = (err) => {
        observer.error(err);
        eventSource.close();
      };
    });
  }
}
