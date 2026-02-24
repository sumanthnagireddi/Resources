import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, map, tap, catchError, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { selectTechnologies } from '../../store/selectors/technology.selector';
import { selectAllContent } from '../../store/selectors/content.selector';
import { getTechnologies } from '../../store/actions/technology.actions';
import { BlogsService } from '../../services/blogs.service';

@Component({
  selector: 'app-hero',
  imports: [RouterModule, CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent implements OnInit {
  contentCount$!: Observable<number>;
  topicsCount$!: Observable<number>;
  technologiesCount$!: Observable<number>;
  blogsCount$!: Observable<number>;

  constructor(private store: Store, private blogsService: BlogsService,private router:Router) {}
  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
  ngOnInit(): void {
    // Dispatch action to load technologies if not already loaded
    this.store.dispatch(getTechnologies());

    // Get total content count
    this.contentCount$ = this.store.select(selectAllContent).pipe(
      map(content => content?.length || 0)
    );

    // Get total topics count across all technologies
    this.topicsCount$ = this.store.select(selectTechnologies).pipe(
      map(technologies => {
        console.log('Technologies in hero:', technologies);
        return technologies.reduce((total, tech) =>
          total + (tech.topics?.length || 0), 0
        );
      })
    );

    // Get technologies count
    this.technologiesCount$ = this.store.select(selectTechnologies).pipe(
      map(technologies => technologies?.length || 0)
    );

    // Get blogs count
    this.blogsCount$ = this.blogsService.getBlogsFromMongo().pipe(
      map((blogs: any) => blogs?.length || 0),
      catchError(() => of(0))
    );
  }
}
