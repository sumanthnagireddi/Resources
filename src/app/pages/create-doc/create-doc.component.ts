import { Component, OnInit } from '@angular/core';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-create-doc',
  imports: [ BreadcrumbComponent, CommonModule],
  templateUrl: './create-doc.component.html',
  styleUrl: './create-doc.component.css',
})
export class CreateDocComponent implements OnInit {
  contentId = '';
  content: any;
  editorMode = 'view'; // 'view' | 'edit'
  contentAvailable = true;
  currentContentTopic = 'JavaScript';
  currentId = '';
  constructor(
    private activatedRoute: ActivatedRoute,
    private store: Store,
    private service: ContentService,
    private route: Router
  ) {}
  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      this.currentId = params['pageId'];
    });
  }
  handleContent(updatedContent: any) {
    const contentPayload = {
      body: updatedContent,
      topicId: this.currentId,
    };
    this.service.createContent(contentPayload).subscribe({
      next: (res: any) => {
        this.route.navigate([`/pages/${res.topicId}`]);
      },
      error: (err) => {
        console.error('Error saving content:', err);
      },
    });
  }
}
