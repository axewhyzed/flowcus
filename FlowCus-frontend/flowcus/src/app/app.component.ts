import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center space-x-8">
              <h1 class="text-xl font-bold text-gray-900">FlowCus</h1>
              <nav class="hidden md:flex space-x-8">
                <a routerLink="/dashboard" routerLinkActive="text-blue-600 border-b-2 border-blue-600" 
                   class="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium transition-colors">
                  Dashboard
                </a>
                <a routerLink="/tasks" routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                   class="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium transition-colors">
                  Tasks
                </a>
                <a routerLink="/templates" routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                   class="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium transition-colors">
                  Templates
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>
      
      <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AppComponent {
  title = 'FlowCus';
}
