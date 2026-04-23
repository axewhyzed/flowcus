import { Component, OnInit } from '@angular/core';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';

@Component({
  selector: 'app-task-subtype',
  templateUrl: './task-subtype.page.html',
  styleUrls: ['./task-subtype.page.css'],
  standalone: true
})
export class TaskSubtypePage implements OnInit {
  subtypes: any[] = [];

  constructor(private taskSubtypeService: TaskSubtypeService) {}

  ngOnInit(): void {
    this.loadSubtypes();
  }

  async loadSubtypes() {
    this.subtypes = await this.taskSubtypeService.getAll();
  }
}
