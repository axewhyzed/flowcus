import { Component } from '@angular/core'; // REMOVED: useState
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, RouterModule],
  template: `
    <div class="flex h-screen bg-zinc-50 overflow-hidden">
      <aside class="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200">
        <div class="p-6 flex items-center gap-3">
          <div class="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">F</div>
          <span class="text-xl font-bold text-zinc-900">FlowCus</span>
        </div>

        <nav class="flex-1 px-4 space-y-1 overflow-y-auto">
          @for (item of menuItems; track item.label) {
            <a [routerLink]="item.route" 
               routerLinkActive="bg-blue-50 text-blue-700"
               class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors">
              <i [class]="item.icon"></i>
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="p-4 border-t border-zinc-200">
          <button (click)="logout()" class="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            Sign Out
          </button>
        </div>
      </aside>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header class="shrink-0 border-b border-zinc-200 bg-white"></app-header>
        <main class="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8">
          <div class="mx-auto max-w-7xl">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  menuItems: any[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'fa-solid fa-house' },
    { label: 'My Tasks', route: '/tasks', icon: 'fa-solid fa-check-circle' },
    { label: 'Timetable', route: '/timetable', icon: 'fa-solid fa-calendar-days' },
    { label: 'Categories', route: '/task-category', icon: 'fa-solid fa-tags' },
    { label: 'Subtypes', route: '/task-subtype', icon: 'fa-solid fa-layer-group' },
  ];

  constructor(private auth: AuthService) {
    // FIX: Changed .subscribe() to .then() because your service returns a Promise
    this.auth.me().then((user: any) => {
      if (user && user.isAdmin) {
        this.menuItems.push({ label: 'User Management', route: '/users', icon: 'fa-solid fa-users-gear' });
      }
    });
  }

  logout() {
    // FIX: Changed .subscribe() to .then()
    this.auth.logout().then(() => window.location.reload());
  }
}