import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.page.html',
  styles: []
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // strict minimal form: username & password only
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void { }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const { username, password } = this.loginForm.value;

    try {
      await this.authService.login({ username, password });
      const navSuccess = await this.router.navigate(['/dashboard']);
      // Optional: If navigation failed (e.g. guard rejection), stop loading
      if (!navSuccess) {
        this.isLoading = false;
      }

    } catch (err: any) {
      this.errorMessage = err?.error?.message || 'Invalid username or password. Please try again.';
      this.isLoading = false; // Only stop loading on error
    }
  }
}