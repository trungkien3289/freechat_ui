import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment';
import { EnvService } from './env.service';

interface DecodedToken {
  id: string;
  userName: string;
  exp: number;
  iat: number;
  isExpired: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = ``; // Change to your Node.js API

  constructor(
    private http: HttpClient,
    public jwtHelper: JwtHelperService,
    private _EnvService: EnvService
  ) {
    this.apiUrl = _EnvService.apiUrl;
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, user);
  }

  login(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login-jwt`, user);
  }

  submitEmotion(emotion: string, description: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/emotion`, {
      emotion,
      description,
    });
  }

  public isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !this.jwtHelper.isTokenExpired(token);
  }

  getEmotionData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/emotion/dashboard`); // Change this to your actual endpoint
  }

  getDecodedToken(): DecodedToken | null {
    const token = localStorage.getItem('token'); // Retrieve token from localStorage
    if (!token) {
      return null; // Return null if token is not available
    }

    try {
      const decodedToken: DecodedToken | null =
        this.jwtHelper.decodeToken<DecodedToken>(token); // Decode the token
      return decodedToken;
    } catch (error) {
      console.error('Error decoding token', error);
      return null;
    }
  }

  getUsername(): string | null {
    const decodedToken = this.getDecodedToken();
    return decodedToken ? decodedToken.userName : null;
  }

  getUserId(): string {
    const decodedToken = this.getDecodedToken();
    return decodedToken ? decodedToken.id : '';
  }

  isUserExpired(): boolean {
    const decodedToken = this.getDecodedToken();
    return decodedToken ? decodedToken.isExpired : false;
  }
}
