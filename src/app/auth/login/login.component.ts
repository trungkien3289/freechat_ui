import { Component } from '@angular/core';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessages = '';
  isLoading = false;

  constructor(
    private userService: UserService,
    private router: Router,
    private _FormBuilder: FormBuilder
  ) {
    this.loginForm = this._FormBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  login = async () => {
    if (this.loginForm.valid) {
      this.isLoading = true;
      try {
        let response = await firstValueFrom(
          this.userService.login(this.loginForm.value)
        );
        localStorage.setItem('token', response.token);
        if(response.isExpired != null && response.isExpired == true) {
          this.router.navigate(['/auth/user-expired']);
        }
        this.router.navigate(['/chatbox']);
      } catch (error: any) {
        this.errorMessages = 'Sign in failed. Please try again.';
      }
      this.isLoading = false;
    }
  };

  moveToSignUp() {
    this.router.navigate(['/auth/register']);
  }
}
