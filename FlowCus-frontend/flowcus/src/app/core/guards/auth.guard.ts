// src/app/core/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    // If we already have an authenticated user in memory, allow.
    if (this.authService.isAuthenticated) {
      return true;
    }

    // Wait for the single page-load restore to complete (will call /me -> refresh if needed)
    const isValid = await this.authService.initRestoreIfNeeded();

    if (isValid) return true;

    // Not authenticated -> redirect to login
    return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
}