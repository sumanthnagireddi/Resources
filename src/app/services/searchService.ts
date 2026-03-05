import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private http = inject(HttpClient);
  search(query: string): Observable<any> {
    return this.http.get(`${environment.API_URL}/search`, { params: { q: query } });
  }
}
