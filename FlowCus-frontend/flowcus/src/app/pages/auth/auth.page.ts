import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest, RegisterRequest } from '../../core/models/auth.model';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  imports: [FormsModule],
  styleUrls: ['./auth.page.css']
})
export class AuthPage {
  username = '';
  password = '';
  name = '';
  isRegister = false;

  constructor(private authService: AuthService, private router: Router) {}

  async submit() {
    try {
      if (this.isRegister) {
        const registerData: RegisterRequest = {
          username: this.username,
          password: this.password,
          name: this.name
        };
        const res = await this.authService.register(registerData);
        localStorage.setItem('auth_token', res.token);
        this.router.navigate(['/dashboard']);
      } else {
        const loginData: LoginRequest = {
          username: this.username,
          password: this.password
        };
        const res = await this.authService.login(loginData);
        localStorage.setItem('auth_token', res.token);
        this.router.navigate(['/dashboard']);
      }
    } catch (err) {
      console.error(err);
    }
  }

  toggleMode() {
    this.isRegister = !this.isRegister;
  }
}
