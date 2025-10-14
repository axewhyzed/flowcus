import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-user',
  standalone: true,
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.css'],
  imports: [CommonModule, FormsModule],
})
export class UserPage implements OnInit {
  user: User | null = null;
  showSuccessMessage = false;
  errorMessage = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUser();
  }

  async loadUser() {
    try {
      console.log('Fetching current user (auth/me)...');
      this.user = await this.userService.getMyUser();
      console.log('User response:', this.user);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading user:', error);
      this.errorMessage = 'Failed to load user profile';
    }
  }

  async updateUser() {
    if (!this.user || !this.user.name?.trim()) {
      this.errorMessage = 'Name is required';
      return;
    }

    try {
      await this.userService.updateUser({ name: this.user.name });
      this.showSuccessNotification();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error updating user:', error);
      this.errorMessage = 'Failed to update profile. Please try again.';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  showSuccessNotification() {
    this.showSuccessMessage = true;
    this.errorMessage = '';
    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 3000);
  }

  dismissNotification() {
    this.showSuccessMessage = false;
    this.errorMessage = '';
  }
}
