import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, inject, OnInit } from '@angular/core';
import { FirestoreDatePipe } from '../../pipes/firestore-date.pipe';
import { FeedItem } from '../feed/feed.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recent-docs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-docs.component.html',
  styleUrls: ['./recent-docs.component.css'],
})
export class RecentDocsComponent implements OnInit {
  @Input() docs: any;
  private readonly router = inject(Router);
  ngOnInit(): void {}
  navigateTo(item: any) {
    this.router.navigate([`/pages/${item.topicId}`]);
  }
}
