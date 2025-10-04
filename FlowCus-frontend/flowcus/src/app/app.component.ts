import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { MainLayoutComponent } from "./layout/main-layout/main-layout.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent],
  template: `
    <app-main-layout></app-main-layout>
  `
})
export class AppComponent {
  title = 'FlowCus';
}
