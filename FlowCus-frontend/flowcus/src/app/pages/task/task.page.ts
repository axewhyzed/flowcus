import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../core/services/task.service';

@Component({
  selector: 'app-task',
  templateUrl: './task.page.html',
  styleUrls: ['./task.page.css']
})
export class TaskPage implements OnInit {
  tasks: any[] = [];

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  async loadTasks() {
    this.tasks = await this.taskService.getAll();
  }
}
