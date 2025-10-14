import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isMenuOpen = false;
  username: string | null = null;
  isLoggedIn = false;
  private routerSubscription?: Subscription;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Check auth status on initialization
    this.checkAuthStatus();

    // Subscribe to router events to update header after navigation
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAuthStatus();
      });
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  checkAuthStatus() {
    const token = localStorage.getItem('auth_token');
    this.isLoggedIn = !!token;
    
    if (token) {
      this.loadUser();
    } else {
      this.username = null;
    }
  }

  async loadUser() {
    try {
      const res = await this.authService.me();
      this.username = res.user?.name || res.user?.username || null;
    } catch (error) {
      console.error('Error loading user:', error);
      this.username = null;
      this.isLoggedIn = false;
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  async logout() {
    try {
      await this.authService.logout();
      localStorage.removeItem('auth_token');
      this.isLoggedIn = false;
      this.username = null;
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  login() {
    this.router.navigate(['/login']);
  }
}
