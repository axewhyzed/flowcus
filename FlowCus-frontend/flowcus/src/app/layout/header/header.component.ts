import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
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
  
  isAdmin = false;
  isAdminMode = false;

  private authSubscription?: Subscription;
  private adminModeSubscription?: Subscription;

  constructor(
    private router: Router, 
    private authService: AuthService, 
    private adminModeService: AdminModeService
  ) { }

  ngOnInit() {
    // 1. Reactive Subscription
    this.authSubscription = this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      this.isLoggedIn = isAuthenticated;
      
      if (isAuthenticated) {
        this.loadUser();
      } else {
        this.username = null;
        this.isAdmin = false;
      }
    });

    // 2. Admin Mode Subscription
    this.adminModeSubscription = this.adminModeService.adminMode$.subscribe(value => {
      this.isAdminMode = value;
    });

    // 3. Initial Check: ONLY if we don't know the state yet.
    // This prevents redundant API calls immediately after a successful login.
    if (!this.authService.isAuthenticated) {
      this.authService.checkAuthStatus();
    }
  }

  ngOnDestroy() {
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.adminModeSubscription) this.adminModeSubscription.unsubscribe();
  }

  async loadUser() {
    try {
      const res = await this.authService.me();
      this.username = res.user?.name || res.user?.username || 'User';
      this.isAdmin = res.isAdmin;
      this.isAdminMode = this.adminModeService.isAdminMode; 
    } catch (error) {
      console.error('Error loading user:', error);
      // Note: We don't manually redirect here because the ApiService 
      // interceptor will handle the 401/Redirect if the session is truly dead.
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