import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { ToastService } from '../../core/services/toast.service';

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

  constructor(
    private userService: UserService,
    private toastService: ToastService
  ) {}

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
      this.toastService.error(this.errorMessage);
    }
  }

  async updateUser() {
    if (!this.user || !this.user.name?.trim()) {
      this.errorMessage = 'Name is required';
      this.toastService.warning(this.errorMessage);
      return;
    }

    try {
      await this.userService.updateUser({ name: this.user.name });
      this.showSuccessNotification();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error updating user:', error);
      this.errorMessage = 'Failed to update profile. Please try again.';
      this.toastService.error(this.errorMessage);
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  showSuccessNotification() {
    this.errorMessage = '';
    this.toastService.success('Profile updated successfully.');
  }

}
