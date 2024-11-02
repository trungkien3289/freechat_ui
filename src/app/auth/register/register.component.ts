import { Component } from '@angular/core';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  signupForm: FormGroup;
  errorMessages = '';
  isLoading = false;

  constructor(
    private userService: UserService,
    private router: Router,
    private _FormBuilder: FormBuilder
  ) {
    this.signupForm = this._FormBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  signUp = async () => {
    if (this.signupForm.valid) {
      this.isLoading = true;
      try {
        let response = await firstValueFrom(
          this.userService.register(this.signupForm.value)
        );

        this.router.navigate(['/auth/login']);
      } catch (error: any) {
        this.errorMessages = 'Sign up failed. Please try again.';
      }

      this.isLoading = false;
    }
  };

  moveToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
