import { Pipe, PipeTransform } from '@angular/core';
import { TaskPriority } from '../../core/models/task.model';

@Pipe({
  name: 'priority',
  standalone: true
})
export class PriorityPipe implements PipeTransform {
  transform(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.High:
        return 'High';
      case TaskPriority.Normal:
        return 'Normal';
      case TaskPriority.Low:
        return 'Low';
      default:
        return 'Unknown';
    }
  }
}
