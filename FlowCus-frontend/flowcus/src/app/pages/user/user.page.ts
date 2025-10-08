import { Component, OnInit } from '@angular/core';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user',
  standalone: true,
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.css'],
  imports: [CommonModule, FormsModule],
})
export class UserPage implements OnInit {
  user: User | null = null;

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.loadUser();
  }

  async loadUser() {
    try {
      console.log('Fetching current user (auth/me)...');
      this.user = await this.userService.getUser(0); // ID ignored in service
      console.log('User response:', this.user);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  }

  async updateUser() {
    if (!this.user) return;
    try {
      await this.userService.updateUser({ name: this.user.name });
      alert('User updated successfully');
    } catch (err) {
      console.error('Error updating user:', err);
    }
  }
}
