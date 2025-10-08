import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest, RegisterRequest } from '../../core/models/auth.model';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-auth',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.css'],
  imports: [FormsModule]
})
export class LoginPage implements OnInit {
  username = '';
  password = '';
  name = '';
  isRegister = false; // enabled via ?mode=register

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    this.isRegister = mode === 'register';
  }

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
}
