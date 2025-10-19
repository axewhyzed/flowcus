import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { filter, Subscription } from 'rxjs';
import { AdminModeService } from '../../core/services/admin-mode.service';

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
  isAdmin = false;          // backend verified
  isAdminMode = false;      // frontend switch state (from service)

  constructor(private router: Router, private authService: AuthService, private adminModeService: AdminModeService) { }

  ngOnInit() {
    // Check auth status on initialization
    this.checkAuthStatus();

    this.adminModeService.adminMode$.subscribe(value => {
      this.isAdminMode = value;
    });

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
    const token = sessionStorage.getItem('auth_token');
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
      this.isAdmin = res.isAdmin;          // ✅ backend verified
      this.isAdminMode = this.adminModeService.isAdminMode; // get initial switch state
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
      sessionStorage.removeItem('auth_token');
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

  onToggleAdminMode() {
    this.adminModeService.toggle();
  }
}
