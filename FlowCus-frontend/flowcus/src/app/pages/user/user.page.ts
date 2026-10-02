import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { ToastService } from '../../core/services/toast.service';
import { ApiService } from '../../core/services/api.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints';
import { DataPortabilityService } from '../../core/services/data-portability.service';
import { SoundFeedbackService } from '../../core/services/sound-feedback.service';

@Component({
  selector: 'app-user',
  standalone: true,
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.css'],
  imports: [CommonModule, FormsModule],
})
export class UserPage implements OnInit {
  user: User | null = null;
  errorMessage = '';

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  isChangingPassword = false;

  constructor(
    private userService: UserService,
    private apiService: ApiService,
    private toastService: ToastService,
    public dataPortability: DataPortabilityService,
    public soundService: SoundFeedbackService
  ) {}

  get soundEnabled(): boolean {
    return this.soundService.enabled;
  }

  toggleSound(): void {
    this.soundService.enabled = !this.soundService.enabled;
    if (this.soundService.enabled) {
      this.soundService.playSuccess();
      this.toastService.success('Audio feedback enabled');
    } else {
      this.toastService.info('Audio feedback muted');
    }
  }

  exportJson(): void {
    this.soundService.playClick();
    this.dataPortability.exportJson();
  }

  exportMarkdown(): void {
    this.soundService.playClick();
    this.dataPortability.exportMarkdown();
  }

  ngOnInit(): void {
    this.loadUser();
  }

  async loadUser() {
    try {
      this.user = await this.userService.getMyUser();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading user:', error);
      this.errorMessage = 'Failed to load user profile';
    }
  }

  async updateUser() {
    if (!this.user || !this.user.name?.trim()) {
      this.errorMessage = 'Name is required';
      this.toastService.warning(this.errorMessage);
      return;
    }

    try {
      const response = await this.userService.updateUser({ name: this.user.name });
      this.errorMessage = '';
      this.toastService.successFrom(response, 'Profile updated successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error updating user:', error);
      this.errorMessage = 'Failed to update profile. Please try again.';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  async changePassword() {
    if (!this.passwordForm.currentPassword) {
      this.toastService.warning('Please enter your current password.');
      return;
    }
    if (!this.passwordForm.newPassword) {
      this.toastService.warning('Please enter a new password.');
      return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      this.toastService.warning('New password must be at least 6 characters long.');
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.toastService.warning('New passwords do not match.');
      return;
    }

    this.isChangingPassword = true;
    try {
      const response = await this.apiService.post<any>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword: this.passwordForm.currentPassword,
        newPassword: this.passwordForm.newPassword
      });
      this.toastService.success(response?.message || 'Password changed successfully.');
      this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Failed to change password. Check current password.';
      this.toastService.error(errorMsg);
    } finally {
      this.isChangingPassword = false;
    }
  }
}
