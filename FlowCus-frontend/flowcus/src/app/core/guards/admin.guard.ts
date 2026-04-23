// core/guards/admin.guard.ts (NEW FILE)
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    async canActivate(): Promise<boolean> {
        const user = this.authService.user;

        // If not logged in, go to login
        if (!user) {
            await this.authService.initRestoreIfNeeded();
        }

        // Check if user is admin
        if (this.authService.user?.isAdmin) {
            return true;
        }

        // Not admin - redirect to dashboard
        this.router.navigate(['/dashboard']);
        return false;
    }
}