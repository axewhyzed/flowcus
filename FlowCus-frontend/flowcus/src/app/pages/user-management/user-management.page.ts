import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-management.page.html'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  loading = true;
  showForm = false;
  editingUser: User | null = null;
  userForm: Partial<User> = {};
  errorMessage = '';
  currentUser: User | null = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      const me = await this.authService.me();
      this.currentUser = me;
      if (!me.isAdmin) {
        alert('This page requires admin rights');
        this.router.navigate(['/dashboard']);
        return;
      }
      this.users = await this.adminService.getAllUsers();
    } catch (err) {
      console.error(err);
      alert('Error loading users');
    } finally {
      this.loading = false;
    }
  }

  openUserForm(user?: User) {
    this.editingUser = user || null;
    this.userForm = user ? { ...user } : { isAdmin: false };
    this.errorMessage = '';
    this.showForm = true;
  }

  closeUserForm() {
    this.showForm = false;
    this.userForm = {};
    this.editingUser = null;
    this.errorMessage = '';
  }

  async saveUser() {
    if (!this.userForm.username) {
      this.errorMessage = 'Username is required';
      return;
    }

    try {
      if (this.editingUser) {
        const updated = await this.adminService.updateUser(this.editingUser.id, this.userForm);
        const index = this.users.findIndex(u => u.id === this.editingUser!.id);
        this.users[index] = updated;
        alert('User updated successfully');
      } else {
        const created = await this.adminService.createUser(this.userForm);
        this.users.unshift(created);
        alert('User created successfully');
      }
      this.closeUserForm();
    } catch (err: any) {
      console.error(err);
      this.errorMessage = err?.error?.message || 'Failed to save user';
    }
  }

  async deleteUser(id: number) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await this.adminService.deleteUser(id);
      this.users = this.users.filter(u => u.id !== id);
      alert('User deleted successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  }
}
