import { Component, inject, OnInit } from '@angular/core';
import { PwaService } from './services/pwa.service';
import { RouterModule } from '@angular/router';



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly pwaService = inject(PwaService);

  ngOnInit(): void {
    if (this.pwaService.isStandalone()) {
      document.body.classList.add('pwa-standalone');
    }
  }
}
