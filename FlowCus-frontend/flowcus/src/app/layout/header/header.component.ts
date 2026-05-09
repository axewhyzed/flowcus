import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { AdminModeService } from '../../core/services/admin-mode.service';
import { ToastService } from '../../core/services/toast.service';

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
    private adminModeService: AdminModeService,
    private toastService: ToastService
  ) { }

 ngOnInit() {
  this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
    const loggedIn = isAuthenticated === true;

    this.isLoggedIn = loggedIn;

    if (loggedIn) {
      const u = this.authService.user;
      this.username = u?.name || u?.username || null;
      this.isAdmin  = u?.isAdmin || false;
    } else {
      this.username = null;
      this.isAdmin = false;
    }
  });

  this.adminModeSubscription = this.adminModeService.adminMode$.subscribe(v => {
    this.isAdminMode = v;
  });
}

  ngOnDestroy() {
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.adminModeSubscription) this.adminModeSubscription.unsubscribe();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  async logout() {
    try {
      const response = await this.authService.logout();
      this.toastService.successFrom(response, 'Signed out successfully.');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  onToggleAdminMode() {
    this.adminModeService.toggle();
  }
}
