import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'flowcus';
  apiUrl = environment.apiUrl;
  currentYear: number = new Date().getFullYear();

  constructor(private http: HttpClient){
    console.log(environment.production);
    console.log('API Url :', this.apiUrl);

    this.fetchData();
  }

  fetchData(){
    this.http.get(`${this.apiUrl}/WeatherForecast`).subscribe((res) => {
      console.log('Data: ', res);
    })
  }
}
