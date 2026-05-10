import { Component, OnInit, signal } from '@angular/core';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ContentService } from '../../services/content.service';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../../component/skeleton/skeleton.component';

@Component({
  selector: 'app-edit-doc',
  imports: [BreadcrumbComponent, CommonModule, SkeletonComponent],
  templateUrl: './edit-doc.component.html',
  styleUrl: './edit-doc.component.css',
})
export class EditDocComponent implements OnInit {
  contentId = '';
  content: any;
  editorMode = 'view'; // 'view' | 'edit'
  contentAvailable = true;
  currentContentTopic = 'JavaScript';
  currentId = '';
  currentTopic!: string;
  isLoading = signal(true);

  constructor(
    private activatedRoute: ActivatedRoute,
    private store: Store,
    private service: ContentService,
    private route: Router
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      this.currentId = params['pageId'];
      this.prepareContent(this.currentId);
    });
  }

  prepareContent(id: string) {
    this.isLoading.set(true);
    this.service.fetchContent(id).subscribe({
      next: (data: any) => {
        this.contentAvailable = true;
        this.content = data?.body;
        this.currentTopic = data?.title;
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  handleContent(updatedContent: any) {
    const contentPayload = {
      body: updatedContent,
    };
    this.service.updateContent(this.currentId, contentPayload).subscribe({
      next: (res: any) => {
        this.route.navigate([`/pages/${res.topicId}`]);
      },
      error: (err) => {
        console.error('Error saving content:', err);
      },
    });
  }
}
