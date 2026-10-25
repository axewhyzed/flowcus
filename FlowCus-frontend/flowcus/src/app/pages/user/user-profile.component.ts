import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { ToastService } from '../../core/services/toast.service';
import { DataPortabilityService } from '../../core/services/data-portability.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
  imports: [CommonModule, FormsModule],
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;
  errorMessage = '';
  isLoading = false;

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  isChangingPassword = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private toastService: ToastService,
    public dataPortability: DataPortabilityService
  ) {}

  exportJson(): void {
    this.dataPortability.exportJson();
  }

  exportMarkdown(): void {
    this.dataPortability.exportMarkdown();
  }

  ngOnInit(): void {
    this.loadUser();
  }

  async loadUser() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.user = await this.userService.getMyUser();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading user:', error);
      this.errorMessage = 'Failed to load user profile';
    } finally {
      this.isLoading = false;
    }
  }

  async updateUser() {
    if (!this.user?.name || this.user.name.trim().length === 0) {
      this.errorMessage = 'Name cannot be empty';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    try {
      await this.userService.updateUser({ name: this.user.name.trim() });
      this.toastService.success('Profile updated successfully');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error updating profile:', error);
      this.errorMessage = 'Failed to update profile';
    } finally {
      this.isLoading = false;
    }
  }

  async changePassword() {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) {
      this.toastService.warning('Please enter current and new password.');
      return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      this.toastService.warning('New password must be at least 6 characters.');
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.toastService.warning('New passwords do not match.');
      return;
    }

    this.isChangingPassword = true;
    try {
      const response = await this.authService.changePassword(
        this.passwordForm.currentPassword,
        this.passwordForm.newPassword
      );
      this.toastService.success(response?.message || 'Password changed successfully.');
      this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    } catch (err: any) {
      const errorMsg = err?.error?.error || err?.error?.message || err?.response?.data?.error || 'Failed to change password. Check current password.';
      this.toastService.error(errorMsg);
    } finally {
      this.isChangingPassword = false;
    }
  }
}
