import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token'); // Retrieve the token
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if the error status is 401
      if (error.status === 401) {
        // Handle the 401 error (Unauthorized)
        localStorage.removeItem('token');

        // Redirect to the login page
        router.navigate(['/auth/login']);
      }
      // Propagate the error
      return throwError(() => error);
    })
  );
};
