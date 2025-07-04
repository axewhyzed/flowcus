import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskPriority } from '../../../core/models/task.model';
import { PriorityPipe } from '../../../shared/pipes/priority.pipe';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, PriorityPipe],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.css']
})
export class TaskCardComponent {
  @Input() task!: Task;
  
  @Output() edit = new EventEmitter<Task>();
  @Output() toggle = new EventEmitter<Task>();
  @Output() delete = new EventEmitter<Task>();

  TaskPriority = TaskPriority;

  onEdit(): void {
    this.edit.emit(this.task);
  }

  onToggle(): void {
    this.toggle.emit(this.task);
  }

  onDelete(): void {
    this.delete.emit(this.task);
  }

  getPriorityClass(): string {
    switch (this.task.priority) {
      case TaskPriority.High:
        return 'bg-red-100 text-red-800 border-red-200';
      case TaskPriority.Normal:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TaskPriority.Low:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getPriorityIconClass(): string {
    switch (this.task.priority) {
      case TaskPriority.High:
        return 'text-red-500';
      case TaskPriority.Normal:
        return 'text-yellow-500';
      case TaskPriority.Low:
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }

  formatDuration(): string {
    if (!this.task.durationSeconds) return '';
    
    const hours = Math.floor(this.task.durationSeconds / 60);
    const minutes = this.task.durationSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  formatTime(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}
