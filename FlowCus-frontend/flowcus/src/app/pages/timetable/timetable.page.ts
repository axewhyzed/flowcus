import { Component, OnInit } from '@angular/core';
import { TimetableService } from '../../core/services/timetable.service';

@Component({
  selector: 'app-timetable',
  templateUrl: './timetable.page.html',
  styleUrls: ['./timetable.page.css']
})
export class TimetablePage implements OnInit {
  timetables: any[] = [];

  constructor(private timetableService: TimetableService) {}

  ngOnInit(): void {
    this.loadTimetables();
  }

  async loadTimetables() {
    this.timetables = await this.timetableService.getAll();
  }
}
