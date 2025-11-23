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
    
    // 1. Optimistic Check: If we already know they are logged in (from previous in-memory state)
    if (this.authService.isAuthenticated) {
      return true;
    }

    // 2. Verification Check: If state is false/unknown (e.g. page refresh), verify cookie with backend
    const isValid = await this.authService.checkAuthStatus();
    
    if (isValid) {
      return true;
    }

    // 3. Not Authenticated: Redirect to login
    return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
}