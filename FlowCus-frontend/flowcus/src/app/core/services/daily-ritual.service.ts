import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { localDateKey } from '../utils/local-date-time';

@Injectable({
  providedIn: 'root'
})
export class DailyRitualService {
  private morningModalSubject = new BehaviorSubject<boolean>(false);
  public morningModal$: Observable<boolean> = this.morningModalSubject.asObservable();

  private eveningModalSubject = new BehaviorSubject<boolean>(false);
  public eveningModal$: Observable<boolean> = this.eveningModalSubject.asObservable();

  private weeklyReviewModalSubject = new BehaviorSubject<boolean>(false);
  public weeklyReviewModal$: Observable<boolean> = this.weeklyReviewModalSubject.asObservable();

  constructor(private authService: AuthService) {}

  public getTodayKey(date = new Date()): string {
    return localDateKey(date);
  }

  public isMorningKickoffCompletedToday(): boolean {
    return this.getStorageValue('kickoff') === 'true';
  }

  public isEveningShutdownCompletedToday(): boolean {
    return this.getStorageValue('shutdown') === 'true';
  }

  public openMorningKickoff(): void {
    this.morningModalSubject.next(true);
  }

  public closeMorningKickoff(): void {
    this.morningModalSubject.next(false);
  }

  public completeMorningKickoff(): void {
    this.setStorageValue('kickoff');
    this.closeMorningKickoff();
  }

  public openEveningShutdown(): void {
    this.eveningModalSubject.next(true);
  }

  public closeEveningShutdown(): void {
    this.eveningModalSubject.next(false);
  }

  public completeEveningShutdown(): void {
    this.setStorageValue('shutdown');
    this.closeEveningShutdown();
  }

  public openWeeklyReview(): void {
    this.weeklyReviewModalSubject.next(true);
  }

  public closeWeeklyReview(): void {
    this.weeklyReviewModalSubject.next(false);
  }

  private getStorageKey(ritual: 'kickoff' | 'shutdown'): string {
    const userId = this.authService.user?.id ?? 'anonymous';
    return `flowcus_${ritual}_${userId}_${this.getTodayKey()}`;
  }

  private getStorageValue(ritual: 'kickoff' | 'shutdown'): string | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(this.getStorageKey(ritual));
    } catch {
      return null;
    }
  }

  private setStorageValue(ritual: 'kickoff' | 'shutdown'): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(this.getStorageKey(ritual), 'true');
    } catch {
      // Ritual state is a convenience; storage restrictions must not block the workflow.
    }
  }
}
