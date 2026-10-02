import { Injectable } from '@angular/core';
import * as chrono from 'chrono-node';

export interface ParsedTaskDraft {
  rawText: string;
  cleanTitle: string;
  startTime: Date | null;
  endTime: Date | null;
  categoryTag: string | null;
  priority: number | null;
  dateDisplayText: string | null;
}

@Injectable({ providedIn: 'root' })
export class NlpTaskParserService {
  parse(input: string): ParsedTaskDraft {
    if (!input || !input.trim()) {
      return {
        rawText: '',
        cleanTitle: '',
        startTime: null,
        endTime: null,
        categoryTag: null,
        priority: null,
        dateDisplayText: null
      };
    }

    let text = input.trim();
    let categoryTag: string | null = null;
    let priority: number | null = null;

    // 1. Extract Category Tag (#work, #study, etc.)
    const catMatch = text.match(/#([a-zA-Z0-9_-]+)/);
    if (catMatch) {
      categoryTag = catMatch[1].toLowerCase();
      text = text.replace(catMatch[0], ' ');
    }

    // 2. Extract Priority (p1 - p5, !high, !med, !low)
    const prioMatch = text.match(/\b(?:p([1-5])|!(high|med|medium|low))\b/i);
    if (prioMatch) {
      if (prioMatch[1]) {
        priority = parseInt(prioMatch[1], 10);
      } else if (prioMatch[2]) {
        const val = prioMatch[2].toLowerCase();
        if (val === 'high') priority = 1;
        else if (val === 'med' || val === 'medium') priority = 3;
        else if (val === 'low') priority = 5;
      }
      text = text.replace(prioMatch[0], ' ');
    }

    // 3. Extract Date & Time using Chrono
    const parsedResults = chrono.parse(text);
    let startTime: Date | null = null;
    let endTime: Date | null = null;
    let dateDisplayText: string | null = null;

    if (parsedResults.length > 0) {
      const firstResult = parsedResults[0];
      const start = firstResult.start;
      startTime = start.date();

      if (firstResult.end) {
        endTime = firstResult.end.date();
      } else {
        // Default 30 min duration if only start time provided
        endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      }

      dateDisplayText = firstResult.text;
      text = text.replace(firstResult.text, ' ');
    }

    // Clean remaining title
    const cleanTitle = text.replace(/\s+/g, ' ').trim();

    return {
      rawText: input,
      cleanTitle: cleanTitle || input.trim(),
      startTime,
      endTime,
      categoryTag,
      priority,
      dateDisplayText
    };
  }
}
