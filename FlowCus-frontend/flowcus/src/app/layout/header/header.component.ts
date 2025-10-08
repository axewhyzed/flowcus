import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterModule],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  isMenuOpen = false;
  username: string | null = null;

  constructor(private router: Router, private authService: AuthService) {
    this.loadUser();
  }

  loadUser() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.authService.me().then(res => {
        this.username = res.user?.name || res.user?.username || null;
      }).catch(() => {
        this.username = null;
      });
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  logout() {
    this.authService.logout().then(() => {
      localStorage.removeItem('auth_token');
      this.router.navigate(['/login']);
    });
  }
}
