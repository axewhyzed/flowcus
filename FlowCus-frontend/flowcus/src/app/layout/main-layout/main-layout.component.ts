import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-header></app-header>
      
      <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <router-outlet></router-outlet>
      </main>
      
      <footer class="bg-white border-t border-gray-200 mt-12">
        <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div class="text-center text-sm text-gray-500">
            © 2024 FlowCus. Built with Angular and Tailwind CSS.
          </div>
        </div>
      </footer>
    </div>
  `
})
export class MainLayoutComponent {}
