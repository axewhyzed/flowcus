import { Component, OnInit } from '@angular/core';
import { TimetableItemService } from '../../core/services/timetable-item.service';

@Component({
  selector: 'app-timetable-item',
  templateUrl: './timetable-item.page.html',
  styleUrls: ['./timetable-item.page.css']
})
export class TimetableItemPage implements OnInit {
  items: any[] = [];

  constructor(private timetableItemService: TimetableItemService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  async loadItems() {
    this.items = await this.timetableItemService.getAll();
  }
}
