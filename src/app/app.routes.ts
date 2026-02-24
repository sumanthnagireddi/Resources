import { Routes } from '@angular/router';
import { LayoutComponent } from './component/layout/layout.component';
import { ContentLayoutComponent } from './pages/content-layout/content-layout.component';
import { DraftsComponent } from './component/drafts/drafts.component';
import { StarredComponent } from './pages/starred/starred.component';
import { FeedComponent } from './component/feed/feed.component';
import { RecentComponent } from './pages/recent/recent.component';
import { CreateDocComponent } from './pages/create-doc/create-doc.component';
import { EditDocComponent } from './pages/edit-doc/edit-doc.component';
import { BlogsComponent } from './pages/blogs/blogs.component';
import { ProfileComponent } from './component/profile/profile.component';
import { SwaggerComponent } from './pages/swagger/swagger.component';
import { ViewBlogComponent } from './pages/blogs/subpages/view-blog/view-blog.component';
import { CreateBlogComponent } from './pages/blogs/subpages/create-blog/create-blog.component';
import { AdminComponent } from './pages/blogs/subpages/admin/admin.component';
import { BlogsHomeComponent } from './pages/blogs/subpages/blogs-home/blogs-home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { FinanceComponent } from './pages/finance/finance.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SnippetsComponent } from './pages/snippets/snippets.component';
import { authGuard, guestGuard } from './guards/auth.guard';
import { AiComponent } from './pages/ai/ai.component';
import { AccessDeniedComponent } from './pages/access-denied/access-denied.component';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';
import { JobsComponent } from './pages/jobs/jobs.component';
import { ProjectsComponent } from './pages/projects/projects.component';
import { BookmarksComponent } from './pages/bookmarks/bookmarks.component';
import { IdeasComponent } from './pages/ideas/ideas.component';
import { InterviewBankComponent } from './pages/interview-bank/interview-bank.component';
import { RoadmapComponent } from './pages/roadmap/roadmap.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'ai',
        component: AiComponent,
        // canActivate: [IpWhitelistGuard],
      },
      {
        path: 'home',
        component: FeedComponent,
      },
      {
        path: 'recent',
        component: RecentComponent,
      },
      {
        path: 'starred',
        component: StarredComponent,
      },
       {
        path: 'roadmap',
        component: RoadmapComponent,
      },
      {
        path: 'roadmap',
        component: RoadmapComponent,
      },
      {
        path:'jobs',
        component: JobsComponent,
      },
      {
        path: 'projects',
        component: ProjectsComponent,
      },
      {
        path: 'bookmarks',
        component: BookmarksComponent,
      },
      {
        path: 'ideas',
        component: IdeasComponent,
      },
      {
        path: 'interview-bank',
        component: InterviewBankComponent,
      },
      {
        path: 'drafts',
        component: DraftsComponent,
      },
      {
        path: 'pages/:pageId',
        component: ContentLayoutComponent,
      },
      {
        path: 'create-new/:pageId',
        component: CreateDocComponent,
      },
      {
        path: 'edit/:pageId',
        component: EditDocComponent,
      },
      {
        path: 'blogs',
        component: BlogsComponent,
        children: [
          {
            path: '',
            component: BlogsHomeComponent,
          },
          {
            path: 'view/:blogId',
            component: ViewBlogComponent,
          },
          {
            path: 'create-blog',
            component: CreateBlogComponent,
          },
          {
            path: 'admin',
            component: AdminComponent,
          },
        ],
      },
      // {
      //   path: 'dashboard',
      //   component: DashboardComponent,
      // },
      {
        path: 'snippets',
        component: SnippetsComponent,
      },
      {
        path: 'finance',
        component: FinanceComponent,
        // canActivate: [IpWhitelistGuard],
      },
      {
        path: 'api-docs',
        component: SwaggerComponent,
      },
    ],
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'access-denied',
    component: AccessDeniedComponent,
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
