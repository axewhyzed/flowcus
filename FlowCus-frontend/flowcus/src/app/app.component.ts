import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, Event, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { HeaderComponent } from './layout/header/header.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { FocusModeComponent } from './shared/components/focus-mode/focus-mode.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { MorningKickoffModalComponent } from './shared/components/morning-kickoff-modal/morning-kickoff-modal.component';
import { EveningShutdownModalComponent } from './shared/components/evening-shutdown-modal/evening-shutdown-modal.component';
import { WeeklyReviewModalComponent } from './shared/components/weekly-review-modal/weekly-review-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    LoadingSpinnerComponent,
    HeaderComponent,
    ToastContainerComponent,
    ConfirmDialogComponent,
    FocusModeComponent,
    CommandPaletteComponent,
    MorningKickoffModalComponent,
    EveningShutdownModalComponent,
    WeeklyReviewModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'flowcus';
  isLoading = false;

  constructor(private router: Router) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        setTimeout(() => {
          this.isLoading = true;
        });
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        setTimeout(() => {
          this.isLoading = false;
        });
      }
    });
  }
}
