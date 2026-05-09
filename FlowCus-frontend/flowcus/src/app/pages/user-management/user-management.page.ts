import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

type UserFormModel = Partial<User> & { password?: string };

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-management.page.html',
  standalone: true
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  loading = true;
  showForm = false;
  editingUser: User | null = null;
  userForm: UserFormModel = {};
  errorMessage = '';
  currentUser: User | null = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private confirmService: ConfirmService
  ) { }

  async ngOnInit() {
    try {
      const me = this.authService.user || await this.authService.me();
      this.currentUser = me;

      if (!me?.isAdmin) {
        this.toastService.error('This page requires admin rights.');
        this.router.navigate(['/dashboard']);
        return;
      }
      this.users = await this.adminService.getAllUsers();
      this.filteredUsers = [...this.users];
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  openUserForm(user?: User) {
    this.editingUser = user || null;
    this.userForm = user ? { ...user, password: '' } : { isAdmin: false, username: '', password: '' };
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
      this.toastService.warning(this.errorMessage);
      return;
    }

    if (!this.editingUser && !this.userForm.password?.trim()) {
      this.errorMessage = 'Password is required for new users';
      this.toastService.warning(this.errorMessage);
      return;
    }

    try {
      if (this.editingUser) {
        const updated = await this.adminService.updateUser(this.editingUser.id, this.userForm);
        const index = this.users.findIndex(u => u.id === this.editingUser!.id);
        this.users[index] = updated;
        this.filteredUsers = [...this.users];
        this.toastService.successFrom(updated, 'User updated successfully.');
      } else {
        const created = await this.adminService.createUser(this.userForm);
        this.users.unshift(created);
        this.filteredUsers = [...this.users];
        this.toastService.successFrom(created, 'User created successfully.');
      }
      this.closeUserForm();
    } catch (err: any) {
      console.error(err);
      this.errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to save user';
    }
  }

  async deleteUser(id: number) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete user',
      message: 'Are you sure you want to delete this user?',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;

    try {
      const response = await this.adminService.deleteUser(id);
      this.users = this.users.filter(u => u.id !== id);
      this.filteredUsers = [...this.users];
      this.toastService.successFrom(response, 'User deleted successfully.');
    } catch (err) {
      console.error(err);
    }
  }

  filterUsers(event: any) {
    this.searchTerm = event.target.value.toLowerCase();

    this.filteredUsers = this.users.filter(user =>
      user.username?.toLowerCase().includes(this.searchTerm) ||
      user.name?.toLowerCase().includes(this.searchTerm)
    );
  }
}
