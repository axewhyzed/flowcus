import { Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AllGetDataComponent } from './pages/all-get-data/all-get-data.component';

export const routes: Routes = [
    { path: '', component: AllGetDataComponent }, // Default route
  { path: 'all-get-data', component: AllGetDataComponent },
  // ... other routes ...
];
