import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-expired',
  templateUrl: './user-expired.component.html',
  styleUrl: './user-expired.component.scss',
})
export class UserExpiredComponent {
  constructor(private router: Router) {}
  backLogin = () => {
    localStorage.removeItem('token');
    this.router.navigate(['/auth/login']);
  };
}
