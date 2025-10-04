import { Component, OnInit } from '@angular/core';
import { UserService } from '../../core/services/user.service';
import { ActivatedRoute } from '@angular/router';
import { User } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  imports: [FormsModule],
  styleUrls: ['./user.page.css']
})
export class UserPage implements OnInit {
  user: User | null = null;
  userId!: number;

  constructor(
    private userService: UserService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.userId) {
      this.loadUser();
    }
  }

  async loadUser() {
    try {
      this.user = await this.userService.getUser(this.userId);
    } catch (err) {
      console.error(err);
    }
  }

  async updateUser() {
    if (!this.user) return;
    try {
      await this.userService.updateUser(this.userId, { name: this.user.name });
      alert('User updated successfully');
    } catch (err) {
      console.error(err);
    }
  }
}
