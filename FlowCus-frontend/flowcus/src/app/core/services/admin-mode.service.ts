// admin-mode.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })

export class AdminModeService {
    private adminModeSubject = new BehaviorSubject<boolean>(false);
    adminMode$ = this.adminModeSubject.asObservable();

    constructor() {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('adminMode');
            if (saved !== null) {
                this.adminModeSubject.next(saved === 'true');
            }
        }
    }

    get isAdminMode(): boolean {
        return this.adminModeSubject.value;
    }

    toggle() {
        const newValue = !this.adminModeSubject.value;
        this.adminModeSubject.next(newValue);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('adminMode', String(newValue));
        }
    }

    setAdminMode(value: boolean) {
        this.adminModeSubject.next(value);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('adminMode', String(value));
        }
    }
}
