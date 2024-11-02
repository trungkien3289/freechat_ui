import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EnvService {
  private env: any = {};

  constructor(private http: HttpClient) {}

  loadEnvConfig(): Observable<any> {
    return this.http.get('/assets/env.json');
  }

  get apiUrl(): string {
    return this.env.apiUrl || '';
  }

  get apiKey(): string {
    return this.env.apiKey || '';
  }

  setEnvConfig(config: any): void {
    this.env = config;
  }
}
