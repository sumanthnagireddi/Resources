import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';
import { PwaService } from './services/pwa.service';
import {
  ADFDoc,
  AtlaskitEditorComponent,
  AtlaskitSideNavComponent
} from '@sumanthnagireddi/atlas-angular';
@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [CommonModule, RouterOutlet, AtlaskitEditorComponent, AtlaskitSideNavComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent implements OnInit {
  title = ' Resources';
  store = inject(Store);
  router = inject(Router);
  pwaService = inject(PwaService); // Initialize PWA service
  value: any;
  document :ADFDoc= {
    version: 1,
    type: 'doc',
    content: [],
  };

  page = {
    title: 'Untitled page',
  };

  sideNavModel = {
    label: 'Navigation',
    sections: [],
  };
  constructor(private http: HttpClient) {}
  ngOnInit(): void {
    // PWA service is initialized automatically via dependency injection
    // Add class to body when running as standalone PWA
    if (this.pwaService.isStandalone()) {
      document.body.classList.add('pwa-standalone');
    }
  }
}
