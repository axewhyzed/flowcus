import { Pipe, PipeTransform } from '@angular/core';
import { TemplateItem } from '../models/template-item.model';

@Pipe({
  name: 'orderByStartTime',
  standalone: true // for standalone components
})
export class OrderByStartTimePipe implements PipeTransform {
  transform(items: TemplateItem[]): TemplateItem[] {
    return items ? items.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];
  }
}
