// src/app/pages/timetable-item/timetable-item.page.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TimetableItemService } from '../../core/services/timetable-item.service';
import { TaskCategoryService } from '../../core/services/task-category.service'; // Import this
import { TimetableItem } from '../../core/models/timetable-item.model';
import { TaskCategory } from '../../core/models/task-category.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-timetable-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timetable-item.page.html'
})
export class TimetableItemPage implements OnInit {
  timetableId: number = 0;
  categories: TaskCategory[] = []; // List for dropdown
  
  // Model matches new interface
  item: Partial<TimetableItem> = {
    dayOfWeek: 1, // Default Monday
    startTime: '09:00:00',
    endTime: '10:00:00'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itemService: TimetableItemService,
    private categoryService: TaskCategoryService // Inject
  ) {}

  async ngOnInit() {
    this.timetableId = Number(this.route.snapshot.paramMap.get('timetableId'));
    this.item.timetableId = this.timetableId;
    
    // Load categories for the dropdown
    try {
      this.categories = await this.categoryService.getAll();
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  async save() {
    try {
      // Ensure required fields
      if (!this.item.taskCategoryId) {
        alert('Please select a category');
        return;
      }
      
      // Backend expects HH:mm:ss. Ensure format is correct if using <input type="time">
      if(this.item.startTime && this.item.startTime.length === 5) {
         this.item.startTime += ':00';
      }
      if(this.item.endTime && this.item.endTime.length === 5) {
         this.item.endTime += ':00';
      }

      await this.itemService.create(this.item);
      this.router.navigate(['/timetables']); // or back to timetable details
    } catch (err) {
      console.error(err);
      alert('Error saving item');
    }
  }
}