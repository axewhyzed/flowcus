import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Task, TaskPriority } from '../../../core/models/task.model';
import { TaskService } from '../../../core/services/task.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.css']
})
export class TaskFormComponent implements OnInit {
  @Input() task: Task | null = null;
  @Input() isOpen = false;

  @Output() saved = new EventEmitter<Task>();
  @Output() cancelled = new EventEmitter<void>();

  taskForm: FormGroup;
  isSubmitting = false;
  error: string | null = null;

  TaskPriority = TaskPriority;

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService
  ) {
    this.taskForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.task) {
      this.populateForm(this.task);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      priority: [TaskPriority.Normal, [Validators.required]],
      startTime: [''],
      endTime: [''],
      isCompleted: [false]
    });
  }

  private populateForm(task: Task): void {
    this.taskForm.patchValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      startTime: task.startTime ? this.formatDateTimeLocal(new Date(task.startTime)) : '',
      endTime: task.endTime ? this.formatDateTimeLocal(new Date(task.endTime)) : '',
      isCompleted: task.isCompleted
    });
  }

  private formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async onSubmit(): Promise<void> {
    if (this.taskForm.valid) {
      this.isSubmitting = true;
      this.error = null;

      try {
        const formValue = this.taskForm.value;

        if (this.task) {
          // Update existing task
          const taskToUpdate: Task = {
            taskId: this.task.taskId,  // We already have the task object
            title: formValue.title,
            description: formValue.description,
            priority: formValue.priority,
            startTime: formValue.startTime ? formValue.startTime : null,
            endTime: formValue.endTime ? formValue.endTime : null,
            isCompleted: formValue.isCompleted,
            updatedBy: "1",
            userId: this.task.userId || "1",  // Assuming '1' if userId is undefined
            createdOn: this.task.createdOn,  // Keeping original createdOn
            isDeleted: this.task.isDeleted || false,  // Keep existing delete state
            durationSeconds: this.task.durationSeconds || 0,  // Keep existing duration if needed
          };

          const updatedTask = await this.taskService.updateTask(this.task.taskId, taskToUpdate);
          this.saved.emit(updatedTask);
        } else {
          // Create new task
          const createRequest: Task = {
            taskId: 0,
            title: formValue.title,
            description: formValue.description,
            priority: formValue.priority,
            startTime: formValue.startTime ? new Date(formValue.startTime) : undefined,
            endTime: formValue.endTime ? new Date(formValue.endTime) : undefined,
            isCompleted: false ,
            createdOn: new Date(),
            isDeleted: false,
            durationSeconds: formValue.durationSeconds || 0,
            userId: '1' // TODO: Get from auth service
          };

          const newTask = await this.taskService.createTask(createRequest);
          this.saved.emit(newTask);
        }

        this.resetForm();
      } catch (error) {
        this.error = 'Failed to save task. Please try again.';
        console.error('Task save error:', error);
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.resetForm();
    this.cancelled.emit();
  }

  private resetForm(): void {
    this.taskForm.reset({
      priority: TaskPriority.Normal,
      isCompleted: false
    });
    this.error = null;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.taskForm.controls).forEach(key => {
      const control = this.taskForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.taskForm.get(fieldName);

    if (field && field.touched && field.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['maxlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is too long`;
      }
    }

    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.taskForm.get(fieldName);
    return !!(field && field.touched && field.errors);
  }

  get isEditMode(): boolean {
    return !!this.task;
  }

  get formTitle(): string {
    return this.isEditMode ? 'Edit Task' : 'Create New Task';
  }

  get submitButtonText(): string {
    if (this.isSubmitting) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update Task' : 'Create Task';
  }

  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];

    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

}
