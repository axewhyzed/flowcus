import { Component, OnInit } from '@angular/core';
import { TasksService} from '../../../services/tasks.service';
import { Task } from '../../models/task.model';
import { TemplateItemsService} from '../../../services/template-items.service';
import { TemplateListsService} from '../../../services/template-lists.service';
import { CommonModule } from '@angular/common';
import { TemplateItem } from '../../models/template-item.model';
import { TemplateList } from '../../models/template-list.model';
import { OrderByStartTimePipe } from '../../pipes/order-by-start-time.pipe';

@Component({
  selector: 'app-all-get-data',
  templateUrl: './all-get-data.component.html',
  styleUrls: ['./all-get-data.component.css'],
  imports: [CommonModule, OrderByStartTimePipe]
})
export class AllGetDataComponent implements OnInit {
  tasks: Task[] = [];
  templateItems: TemplateItem[] = [];
  templateLists: TemplateList[] = [];

  // For demo, use fixed IDs for templateId and userId
  templateId = 1;
  userId = 1;

  // New: Grouped items for timetable display
  groupedTemplateItems: { [templateId: number]: { [dayOfWeek: number]: TemplateItem[] } } = {};

  constructor(
    private tasksService: TasksService,
    private templateItemsService: TemplateItemsService,
    private templateListsService: TemplateListsService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.loadTemplateItems();
    this.loadTemplateLists();
  }

  loadTasks(): void {
    this.tasksService.getTasks().subscribe({
      next: (data) => this.tasks = data,
      error: (err) => console.error('Error loading tasks:', err)
    });
  }

  loadTemplateItems(): void {
    this.templateItemsService.getTemplateItems(this.templateId).subscribe({
      next: (data) => {
        this.templateItems = data;
        this.groupTemplateItems(); // 🔼 Add this line
      },
      error: (err) => console.error('Error loading template items:', err)
    });
  }

  loadTemplateLists(): void {
    this.templateListsService.getTemplates(this.userId).subscribe({
      next: (data) => this.templateLists = data,
      error: (err) => console.error('Error loading template lists:', err)
    });
  }

  // Grouping logic
  groupTemplateItems(): void {
    this.groupedTemplateItems = {};
    for (const item of this.templateItems) {
      if (!this.groupedTemplateItems[item.templateId]) {
        this.groupedTemplateItems[item.templateId] = {};
      }
      if (!this.groupedTemplateItems[item.templateId][item.dayOfWeek]) {
        this.groupedTemplateItems[item.templateId][item.dayOfWeek] = [];
      }
      this.groupedTemplateItems[item.templateId][item.dayOfWeek].push(item);
    }
  }

  dayName(day: number): string {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
  }

  daysOfWeek(): number[] {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}
