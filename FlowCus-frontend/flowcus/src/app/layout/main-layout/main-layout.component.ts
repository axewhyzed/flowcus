import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
// Header removed from here to avoid duplication since it is now in AppComponent

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Main Content Area -->
      <main class="flex-1 w-full relative">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: []
})
export class MainLayoutComponent {}