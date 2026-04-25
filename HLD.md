# High-Level Design (HLD) - Interview Resources Repository

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Project Type:** Full-Stack Web Application  
**Frontend**: Angular 19 (Standalone Components)  
**Backend**: Cloud Services (Firebase, External APIs)  
**Deployment**: Server.js Express wrapper with PWA support

---

## 1. Executive Summary

The **Interview Resources** repository is a comprehensive full-stack Angular application designed as a learning and resource management platform for interview preparation, coding practice, and professional development. It's a feature-rich, modern Angular 19 application with Firebase integration, state management (NgRx), and PWA capabilities.

**Primary Purpose:**
- Interview question bank and resources
- Learning materials organization
- Blog and article publication
- Finance tracking for learning expenses
- AI-powered assistance
- Project portfolio management
- Code snippet storage
- Bookmarks and favorites management
- Learning roadmaps and job tracking

---

## 2. System Architecture Overview

### 2.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    External Users                             │
│         (Desktop, Mobile, Web Browsers)                       │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│            CDN / Static Asset Hosting                         │
│                                                               │
│    (dist/ - Production Build - Compiled Angular App)         │
└────────────┬─────────────────────────────┬────────────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐  ┌────────────────────────────────┐
│  Express Server          │  │  Service Worker (PWA)          │
│  (server.js wrapper)     │  │                                │
│                          │  │  - Offline support            │
│  - Environment config    │  │  - Caching strategies         │
│  - Static file serving   │  │  - Background sync           │
│  - Firebase config       │  └────────────────────────────────┘
│  - Port 3000            │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│              Angular Application (Browser)                    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ App Root Component                                     │  │
│  │ ├─ Layout Component                                   │  │
│  │ │  ├─ Sidebar Navigation                              │  │
│  │ │  ├─ Header with Theme/Profile                       │  │
│  │ │  └─ Main Router Outlet                              │  │
│  │ └─ Route Guard (Auth Guard, IP Whitelist Guard)       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Feature Modules & Pages                               │  │
│  │                                                        │  │
│  │  ├─ Content Pages (Create, Edit, View Docs)           │  │
│  │  ├─ Blog System (Create, View, Admin)                 │  │
│  │  ├─ Finance Tracking                                  │  │
│  │  ├─ Interview Bank                                    │  │
│  │  ├─ AI Assistant v1 & v2                              │  │
│  │  ├─ Dashboard                                         │  │
│  │  ├─ Projects & Snippets                               │  │
│  │  ├─ Bookmarks & Ideas                                 │  │
│  │  ├─ Roadmap & Jobs                                    │  │
│  │  └─ Auth Pages (Login, Register)                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ State Management Layer (NgRx)                          │  │
│  │ ├─ Actions                                             │  │
│  │ ├─ Reducers                                            │  │
│  │ ├─ Effects                                             │  │
│  │ ├─ Selectors                                           │  │
│  │ └─ localStorage Integration (persist-storage)          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Services Layer                                         │  │
│  │ ├─ API Services (HTTP client)                          │  │
│  │ ├─ Authentication Service                             │  │
│  │ ├─ Firebase Services                                  │  │
│  │ ├─ Loading Service                                    │  │
│  │ ├─ Theme Service                                      │  │
│  │ └─ Search Service                                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Common Infrastructure                                 │  │
│  │ ├─ Interceptors (loading, auth)                        │  │
│  │ ├─ Guards (auth, guest, IP whitelist)                 │  │
│  │ ├─ Directives                                          │  │
│  │ ├─ Pipes (custom transforms)                          │  │
│  │ ├─ Models/Interfaces                                   │  │
│  │ ├─ Configuration                                       │  │
│  │ └─ Utilities                                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ UI Component Library                                   │  │
│  │ ├─ Reusable Components                                 │  │
│  │ ├─ Tailwind CSS Styling                                │  │
│  │ ├─ Responsive Design                                   │  │
│  │ └─ Accessibility Support                               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Firebase    │  │ WebServices  │  │  Local Storage   │
│  Backend     │  │  Backend API │  │  (Browser Cache) │
│              │  │              │  │                  │
│ - Auth       │  │ - Content API│  │ - Redux State    │
│ - Firestore  │  │ - Blog API   │  │ - User Prefs     │
│ - Realtime   │  │ - Finance API│  │ - Bookmarks      │
│ - Storage    │  │ - AI API     │  │ - Recent Items   │
└──────────────┘  └──────────────┘  └──────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | Angular | 19.0.0 |
| **Language** | TypeScript | 5.6.2 |
| **State Management** | NgRx | 19.2.1 |
| **Backend Integration** | @angular/fire | 19.2.0 |
| **CSS Framework** | Tailwind CSS | 3.4.17 |
| **Forms** | @angular/forms | 19.0.0 |
| **HTTP Client** | @angular/common/http | 19.0.0 |
| **Routing** | @angular/router | 19.0.0 |
| **Firebase** | Firebase/AngularFire | Latest |
| **Storage** | localStorage, Session Storage | Browser native |
| **Build Tool** | Webpack (via CLI) | Latest |
| **Testing** | Jasmine + Karma | 5.4 |
| **Linting** | ESLint + Angular ESLint | Latest |
| **PWA** | Service Worker | Generated |
| **Dev Server** | Angular CLI Server | 19.0.4 |
| **Production Server** | Express (Node.js) | 4.x |

---

## 3. Application Structure & Modules

### 3.1 Directory Structure

```
src/
├── index.html                      # Main HTML entry point
├── main.ts                         # Bootstrap entry
├── styles.css                      # Global styles
├── environments/                   # Environment configs
│   ├── environment.ts              # Development
│   └── environment.prod.ts         # Production
├── app/
│   ├── app.config.ts              # Application configuration
│   ├── app.routes.ts              # Route definitions
│   ├── app.component.ts/html/css  # Root component
│   │
│   ├── component/                 # Shared Components
│   │   ├── layout/
│   │   ├── feed/
│   │   ├── drafts/
│   │   ├── profile/
│   │   └── ... (other components)
│   │
│   ├── pages/                     # Feature Pages
│   │   ├── login/
│   │   ├── register/
│   │   ├── dashboard/
│   │   ├── content-layout/
│   │   ├── create-doc/
│   │   ├── edit-doc/
│   │   ├── blogs/
│   │   ├── finance/
│   │   ├── ai/
│   │   ├── ai-v2/
│   │   ├── interview-bank/
│   │   ├── projects/
│   │   ├── snippets/
│   │   ├── bookmarks/
│   │   ├── ideas/
│   │   ├── jobs/
│   │   ├── roadmap/
│   │   └── ... (other pages)
│   │
│   ├── services/                  # Angular Services
│   │   ├── auth.service.ts
│   │   ├── content.service.ts
│   │   ├── blogs.service.ts
│   │   ├── finance.service.ts
│   │   ├── ai.service.ts
│   │   ├── technology.service.ts
│   │   ├── topics.service.ts
│   │   ├── resources.service.ts
│   │   ├── snippets.service.ts
│   │   ├── starred.service.ts
│   │   ├── search.service.ts
│   │   ├── loading.service.ts
│   │   ├── theme.service.ts
│   │   ├── pwa.service.ts
│   │   └── ... (other services)
│   │
│   ├── store/                      # NgRx State Management
│   │   ├── reducers/
│   │   │   ├── sidebar.reducer.ts
│   │   │   ├── technology.reducer.ts
│   │   │   ├── content.reducer.ts
│   │   │   ├── blog.reducer.ts
│   │   │   ├── starred.reducer.ts
│   │   │   ├── finance.reducer.ts
│   │   │   └── ... (other reducers)
│   │   │
│   │   ├── effects/
│   │   │   ├── sidebar.effects.ts
│   │   │   ├── technology.effects.ts
│   │   │   ├── content.effects.ts
│   │   │   ├── blog.effects.ts
│   │   │   ├── starred.effects.ts
│   │   │   ├── finance.effects.ts
│   │   │   └── ... (other effects)
│   │   │
│   │   ├── selectors/
│   │   ├── actions/
│   │   └── index.ts
│   │
│   ├── interceptors/                # HTTP Interceptors
│   │   └── loading.interceptor.ts
│   │
│   ├── guards/                       # Route Guards
│   │   ├── auth.guard.ts
│   │   └── ip-whitelist.guard.ts
│   │
│   ├── directives/                   # Custom Directives
│   │
│   ├── pipes/                        # Custom Pipes
│   │
│   ├── model/                        # Data Models/Interfaces
│   │   ├── content.model.ts
│   │   ├── blog.model.ts
│   │   ├── finance.model.ts
│   │   ├── technology.model.ts
│   │   └── ... (other models)
│   │
│   ├── config/                       # Application Config
│   │
│   └── utilities/                    # Helper Functions
│
├── assets/                           # Static Assets
│   └── icons/
│
└── ngsw-config.json                  # Service Worker Config
```

### 3.2 Feature Modules Overview

| Module | Component | Routes | Purpose |
|--------|-----------|--------|---------|
| **Authentication** | LoginComponent, RegisterComponent | /login, /register | User authentication |
| **Dashboard** | DashboardComponent | /dashboard | Overview & analytics |
| **Content** | ContentLayoutComponent, CreateDocComponent, EditDocComponent | /pages/:id, /create-new | Content management |
| **Blog** | BlogsComponent, ViewBlogComponent, CreateBlogComponent, AdminComponent | /blogs, /blogs/:id | Blog platform |
| **AI Assistant** | AiComponent, AiV2Component | /ai, /ai-v2 | AI-powered Q&A |
| **Finance** | FinanceComponent | /finance | Expense tracking |
| **Interview Bank** | InterviewBankComponent | /interview-bank | Interview questions & answers |
| **Projects** | ProjectsComponent | /projects | Project management |
| **Snippets** | SnippetsComponent | /snippets | Code snippet storage |
| **Bookmarks** | BookmarksComponent | /bookmarks | Saved references |
| **Ideas** | IdeasComponent | /ideas | Idea capture |
| **Jobs** | JobsComponent | /jobs | Job tracking |
| **Roadmap** | RoadmapComponent | /roadmap | Learning paths |
| **Starred** | StarredComponent | /starred | Favorite items |
| **Recent** | RecentComponent | /recent | Recently viewed |
| **Drafts** | DraftsComponent | /drafts | Unpublished content |
| **Profile** | ProfileComponent | /profile | User profile |

---

## 4. State Management Architecture (NgRx)

### 4.1 NgRx Store Structure

```
Store Root
├── sidebar
│   ├── state: { isOpen: boolean, selectedItems: [] }
│   ├── reducer: SidebarReducer
│   ├── effects: SidebarEffects
│   └── selectors: selectSidebarOpen, etc.
│
├── technologies
│   ├── state: { items: Technology[], loading: boolean }
│   ├── reducer: TechnologyReducer
│   ├── effects: TechnologyEffects (fetch, create, update, delete)
│   └── selectors: selectAllTechnologies, selectTechByID, etc.
│
├── content
│   ├── state: { items: Content[], current: Content, loading: boolean }
│   ├── reducer: ContentReducer
│   ├── effects: ContentEffects (CRUD operations & filtering)
│   └── selectors: selectAllContent, selectContentByTopic, etc.
│
├── topics
│   ├── state: { items: Topic[], loading: boolean }
│   ├── reducer: TopicReducer
│   ├── effects: TopicEffects
│   └── selectors: selectTopicsByTechnology, etc.
│
├── blogs
│   ├── state: { blogs: Blog[], posts: BlogPost[], loading: boolean }
│   ├── reducer: BlogReducer
│   ├── effects: BlogEffects (fetch blogs, posts, manage)
│   └── selectors: selectAllBlogs, selectBlogPosts, etc.
│
├── starred
│   ├── state: { items: Starred[], loading: boolean }
│   ├── reducer: StarredReducer
│   ├── effects: StarredEffects (add, remove starred items)
│   └── selectors: selectStarredItems, etc.
│
└── finance
    ├── state: { expenses: Expense[], stats: FinanceStats }
    ├── reducer: FinanceReducer
    ├── effects: FinanceEffects (track expenses, AI analysis)
    └── selectors: selectExpenses, selectTotalSpent, etc.
```

### 4.2 Data Flow with Effects

```
Component
  │
  ├─ dispatch(Action)
  │
  └─► Effects
       │
       ├─ Intercept action (ofType)
       │
       ├─ Call service (HTTP/Firebase)
       │
       ├─ Transform response
       │
       └─► dispatch(SuccessAction || ErrorAction)
           │
           └─► Reducer processes action
               │
               └─► Updates store state
                   │
                   └─► Component receives updated state
                       (via selectors & async pipe)
```

### 4.3 Persistent State

- **localStorage Integration**: NgRx state persisted via `ngrx-store-localstorage`
- **Survival**: Store state survives browser refresh
- **Selective**: Only specific slices are persisted
- **Sync**: Restored on application initialization

---

## 5. Routing Architecture

### 5.1 Route Configuration

```typescript
Routes Structure:

/ (root)
├─ AuthGuard Check
└─ LayoutComponent (authenticated users)
   ├─ FeedComponent (default: /home)
   ├─ RecentComponent (/recent)
   ├─ StarredComponent (/starred)
   ├─ DraftsComponent (/drafts)
   ├─ ContentLayoutComponent (/pages/:pageId)
   ├─ CreateDocComponent (/create-new/:pageId)
   ├─ EditDocComponent (/edit/:docId)
   ├─ BlogsComponent (/blogs)
   │  └─ ViewBlogComponent (view-blog/:blogId)
   │  └─ CreateBlogComponent (create-blog)
   │  └─ AdminComponent (admin)
   │  └─ BlogsHomeComponent (home)
   ├─ FinanceComponent (/finance)
   ├─ DashboardComponent (/dashboard)
   ├─ SnippetsComponent (/snippets)
   ├─ AiComponent (/ai)
   ├─ AiV2Component (/ai-v2)
   ├─ AccessDeniedComponent (/access-denied)
   ├─ InterviewBankComponent (/interview-bank)
   ├─ JobsComponent (/jobs)
   ├─ ProjectsComponent (/projects)
   ├─ BookmarksComponent (/bookmarks)
   ├─ IdeasComponent (/ideas)
   ├─ RoadmapComponent (/roadmap)
   ├─ ProfileComponent (/profile)
   └─ SavedComponent (/saved)

/login (GuestGuard - non-authenticated only)
├─ LoginComponent

/register (GuestGuard - non-authenticated only)
├─ RegisterComponent

/swagger
├─ SwaggerComponent
```

### 5.2 Route Guards

```typescript
authGuard
  - Checks if user is authenticated
  - Validates JWT token
  - Redirects to login if not authenticated
  - Allows route access if valid

guestGuard
  - Checks if user is NOT authenticated
  - Redirects to home if authenticated
  - Prevents logged-in users from accessing login/register

IpWhitelistGuard
  - Checks user's IP address (for Premium/Admin features)
  - Allows/denies access to restricted features
  - Can be applied per route
```

---

## 6. Firebase Integration

### 6.1 Firebase Services

```typescript
// Authentication
Firebase Auth
  ├─ Email/Password login
  ├─ Token management
  ├─ Session persistence
  └─ Logout

// Cloud Firestore
Firestore Database
  ├─ Real-time document updates
  ├─ Collection-based data model
  ├─ Offline persistence (optional)
  └─ Query capabilities

// Realtime Database
Firebase Realtime DB
  ├─ High-frequency updates
  ├─ JSON structure
  └─ Real-time synchronization

// Cloud Storage
Firebase Storage
  ├─ File uploads
  ├─ User-generated content
  └─ Asset hosting
```

### 6.2 Firebase Configuration

- **Configuration Source**: `environment.ts` (generated by server.js)
- **Configuration Injection**: Provided via app.config.ts
- **Environment Variables**: Read from `FIREBASE_CONFIG` env var
- **Generation Script**: server.js dynamically generates environment.ts

---

## 7. Services Architecture

### 7.1 Core Services

#### AuthService
```typescript
login(email, password): Observable<AuthResponse>
register(email, password, name): Observable<AuthResponse>
logout(): Observable<void>
getCurrentUser(): User
getToken(): string
isAuthenticated(): boolean
```

#### ContentService
```typescript
getAllContent(): Observable<Content[]>
getContentById(id): Observable<Content>
createContent(content): Observable<Content>
updateContent(id, content): Observable<Content>
deleteContent(id): Observable<void>
publishContent(id): Observable<Content>
getContentByTopic(topicId): Observable<Content[]>
```

#### BlogService
```typescript
getBlogs(): Observable<Blog[]>
getBlogById(id): Observable<Blog>
createBlog(blog): Observable<Blog>
updateBlog(id, blog): Observable<Blog>
deleteBlog(id): Observable<void>
getBlogPosts(blogId): Observable<BlogPost[]>
addPostToBlog(blogId, post): Observable<BlogPost>
```

#### FinanceService
```typescript
getExpenses(): Observable<Expense[]>
addExpense(expense): Observable<Expense>
updateExpense(id, expense): Observable<Expense>
deleteExpense(id): Observable<void>
getFinanceStats(): Observable<FinanceStats>
analyzeExpensesWithAI(): Observable<Analysis>
```

#### AIService
```typescript
askQuestion(query): Observable<AIResponse>
askQuestionStream(query): Observable<string[]> // streaming
analyzeFunds(): Observable<AIAnalysis>
```

#### TechnologyService
```typescript
getAllTechnologies(): Observable<Technology[]>
getTopicsForTechnology(techId): Observable<Topic[]>
```

#### TopicsService
```typescript
getTopicById(id): Observable<Topic>
getContentForTopic(topicId): Observable<Content[]>
```

#### SnippetsService, StarredService, SearchService
```typescript
// Similar CRUD operations for respective features
```

#### LoadingService
```typescript
show(): void
hide(): void
isLoading$: Observable<boolean>
```

#### ThemeService
```typescript
getTheme(): Theme
setTheme(theme): void
subscribeToTheme(): Observable<Theme>
```

#### PWAService
```typescript
checkForUpdates(): Promise<boolean>
installUpdate(): Promise<void>
isOnline$: Observable<boolean>
```

---

## 8. HTTP Interceptors

### 8.1 Loading Interceptor

```typescript
LoadingInterceptor
  ├─ Intercepts all HTTP requests
  ├─ Shows loading indicator (via LoadingService)
  ├─ Hides loading indicator on response
  ├─ Handles both success & error responses
  └─ Enables global loading spinner
```

### 8.2 Future Interceptors (if needed)

```typescript
AuthInterceptor
  ├─ Attaches JWT token to all requests
  ├─ Handles 401 responses
  └─ Refreshes expired tokens

ErrorInterceptor
  ├─ Centralizes error handling
  ├─ Shows error notifications
  └─ Logs errors for debugging
```

---

## 9. Application Configuration

### 9.1 app.config.ts

```typescript
ApplicationConfig:
  ├─ Zone Change Detection (eventCoalescing: true)
  ├─ Router Configuration
  │  ├─ Component Input Binding Enabled
  │  ├─ In-Memory Scroll Restoration
  │  └─ Routes array defined in app.routes.ts
  │
  ├─ Firebase Services
  │  ├─ Auth Service
  │  ├─ Firestore Database
  │  └─ Realtime Database
  │
  ├─ NgRx Store Configuration
  │  ├─ Store initialization with reducers
  │  ├─ MetaReducers (logging, etc.)
  │  ├─ Effects enabled (all modules)
  │  └─ Store Devtools for debugging
  │
  ├─ HTTP Client
  │  ├─ withInterceptors([loadingInterceptor])
  │  └─ Global HTTP configuration
  │
  └─ Service Worker
     ├─ PWA support
     ├─ Offline capabilities
     ├─ Auto-update strategy
     └─ Registration timing
```

---

## 10. Build & Deployment

### 10.1 Build Process

```
Source Code (TypeScript + Angular Templates)
  │
  ├─ ng build (production)
  │
  ├─ Webpack bundling
  │
  ├─ Tree-shaking & minification
  │
  ├─ AOT compilation
  │
  └─ dist/ directory created
     │
     ├─ index.html
     ├─ main.js (bundled code)
     ├─ styles.css
     ├─ ngsw-worker.js (Service Worker)
     └─ assets/
```

### 10.2 Production Deployment

```
1. Build Angular application
   └─ npm run build

2. Start Express server
   └─ node server.js

3. Server generates Firebase config
   └─ environment.ts created with config from env vars

4. Express serves dist/ directory
   └─ Port 3000

5. Angular app boots in browser
   └─ Service Worker registered

6. Application ready for users
```

### 10.3 Express Server (server.js)

```javascript
Function: server.js

1. Reads FIREBASE_CONFIG from environment
2. Parses JSON configuration
3. Generates environment.ts with Firebase config
4. Creates environment file in src/environments/
5. Sets production: true flag
6. Provides API_URL pointing to webservices backend
7. (Would serve static files if extended)
```

---

## 11. User Interface & Styling

### 11.1 Styling Architecture

```
Global Styles (styles.css)
  │
  ├─ Tailwind CSS Framework
  │  ├─ Utility classes
  │  ├─ Component classes
  │  ├─ Responsive breakpoints
  │  └─ Dark mode support (if enabled)
  │
  ├─ Custom Variables
  │
  └─ Reset/Normalize styles

Component Styles (component.css/app.component.scss)
  │
  ├─ Scoped styles (Angular view encapsulation)
  ├─ SCSS support
  └─ Component-specific styling
```

### 11.2 Responsive Design

- **Mobile First**: Tailwind's mobile-first approach
- **Breakpoints**: sm, md, lg, xl, 2xl
- **Responsive Components**: Flex, Grid layouts
- **Adaptive UI**: Different layouts for different screen sizes

### 11.3 Tailwind Configuration

```
tailwind.config.js
├─ Custom theme colors
├─ Extended breakpoints
├─ Custom fonts
├─ Plugin configurations
└─ Accessibility improvements
```

---

## 12. PWA (Progressive Web App) Capabilities

### 12.1 Service Worker Configuration (ngsw-config.json)

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "lazy",
      "resources": {
        "files": ["/assets/**"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api",
      "urls": ["**"],
      "cacheConfig": {
        "maxSize": 100,
        "maxAge": "24h",
        "strategy": "freshness"
      }
    }
  ]
}
```

### 12.2 PWA Features

- **Offline Support**: Service Worker caches assets
- **Offline Content**: Pre-cached pages available offline
- **Background Sync**: Syncs data when connection restored
- **Install Prompt**: Add to home screen capability
- **App Manifest**: manifest.webmanifest for app metadata
- **Icon Support**: Multiple sizes for different devices

---

## 13. Security Features

### 13.1 Authentication Security

- **JWT Tokens**: Secure token-based authentication
- **Firebase Auth**: Managed authentication service
- **Password Storage**: Hashed passwords on backend
- **HTTPS**: Enforced in production
- **CORS**: Configured for allowed origins

### 13.2 Authorization

- **Route Guards**: AuthGuard, GuestGuard for route protection
- **IP Whitelist Guard**: Optional IP-based access control
- **Role-Based**: Can implement RBAC in future

### 13.3 Data Protection

- **Local Storage**: User preferences only (no sensitive data)
- **Session Storage**: Temporary session data
- **Secure Cookies**: If implementing cookie-based auth
- **HTTPS Only**: All API communications over HTTPS

---

## 14. API Integration

### 14.1 Backend Integration Points

```
WebServices Backend API (https://webservices-rqvr.onrender.com)
  │
  ├─ /auth/* - Authentication endpoints
  │  ├─ POST /login
  │  ├─ POST /refresh
  │  └─ POST /logout
  │
  ├─ /content/* - Content endpoints
  │  ├─ GET /content
  │  ├─ POST /content
  │  ├─ PATCH /content/:id
  │  └─ DELETE /content/:id
  │
  ├─ /blogs/* - Blog endpoints
  │  ├─ GET /blogs
  │  ├─ POST /blogs
  │  └─ /blogs/:id/posts - Blog posts
  │
  ├─ /ai/* - AI endpoints
  │  ├─ POST /ai/ask
  │  ├─ POST /ai/ask/stream
  │  └─ POST /ai/add-expense
  │
  ├─ /finance/* - Finance endpoints
  │  ├─ GET /finance/expenses
  │  ├─ POST /finance/expenses
  │  └─ GET /finance/stats
  │
  ├─ /technologies/* - Tech catalog
  │
  ├─ /snippets/* - Code snippets
  │
  └─ /interview-bank/* - Interview questions
```

### 14.2 API Call Pattern

```typescript
// Service layer calls backend
async getContents(): Promise<Content[]> {
  return this.http.get<Content[]>(
    `${environment.API_URL}/content`
  ).toPromise();
}

// Component dispatches NgRx action
dispatch(ContentActions.loadContent());

// Effect intercepts action
@Effect()
loadContent$ = this.actions$.pipe(
  ofType(ContentActions.loadContent),
  switchMap(() =>
    this.contentService.getContents().pipe(
      map(data => ContentActions.loadContentSuccess(data)),
      catchError(err => ContentActions.loadContentError(err))
    )
  )
);

// Reducer updates store
// Component receives data through selector
```

---

## 15. Development Workflow

### 15.1 Development Commands

```bash
# Installation
npm install

# Development Server
ng serve                          # Run on http://localhost:4200
ng serve --watch                  # Auto-rebuild on changes

# Build
npm run build                     # Production build
npm run build -- --configuration=development

# Watch Build
npm run watch                     # Watch mode build

# Testing
npm test                          # Run unit tests
ng test --watch --browsers=Chrome

# Code Quality
ng lint                           # ESLint rules
npm run format                    # Prettier formatting

# Production
npm run build
npm run start                     # Start via server.js
node server.js
```

### 15.2 Development Environment Setup

```bash
# Set environment variables
export FIREBASE_CONFIG='{"projectId":"...","apiKey":"..."...}'

# Install dependencies
npm install

# Start development server
ng serve

# In another terminal, start production build
npm run build
node server.js
```

---

## 16. Data Models

### 16.1 Core Models

#### User Model
```typescript
{
  id: string,
  email: string,
  name: string,
  avatar?: string,
  role: 'user' | 'admin',
  createdAt: Date,
  preferences: {
    theme: 'light' | 'dark',
    emailNotifications: boolean
  }
}
```

#### Content Model
```typescript
{
  id: string,
  title: string,
  body: string,
  status: 'draft' | 'published' | 'archived',
  technologyId: string,
  topicId: string,
  authorId: string,
  viewCount: number,
  readingTime: number,
  tags: string[],
  createdAt: Date,
  updatedAt: Date
}
```

#### Blog Model
```typescript
{
  id: string,
  title: string,
  slug: string,
  description: string,
  status: 'draft' | 'published',
  authorId: string,
  authorName: string,
  isFeatured: boolean,
  viewCount: number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Finance Model
```typescript
{
  id: string,
  userId: string,
  amount: number,
  category: string,
  description: string,
  date: Date,
  tags: string[],
  createdAt: Date
}
```

---

## 17. Monitoring & Analytics

### 17.1 Application Monitoring

- **Loading States**: LoadingService tracks HTTP requests
- **Error Tracking**: Global error handling
- **Performance**: Angular DevTools available in dev mode
- **NgRx DevTools**: Time-travel debugging for store

### 17.2 User Analytics (Future)

- Page view tracking
- Feature usage tracking
- Performance metrics
- Error rate monitoring

---

## 18. Key Features

### 18.1 Content Management
- Create, edit, publish, archive content
- Organize by topic and technology
- Markdown/HTML support
- Draft saving

### 18.2 Blog Platform
- Create and manage multiple blogs
- Featured and pinned posts
- Status workflow (draft → review → published)
- Author information and engagement metrics

### 18.3 AI Assistant
- Integration with multiple LLMs
- Real-time streaming responses
- Context-aware answers (RAG)
- Finance-specific AI (expense analysis)

### 18.4 Finance Tracking
- Expense logging
- Category-based organization
- AI-powered analysis
- Financial statistics

### 18.5 Interview Resources
- Question bank and resources
- Category organization
- Answer references
- Preparation guidance

### 18.6 Project & Snippet Management
- Code snippet storage and organization
- Project portfolio management
- Tagging and search
- Version tracking

### 18.7 Learning Roadmap
- Structured learning paths
- Progress tracking
- Technology sequencing
- Resource recommendations

---

## 19. Future Enhancements

- [ ] Real-time collaboration features
- [ ] Advanced search with filters
- [ ] Comment and discussion system
- [ ] Social sharing capabilities
- [ ] API rate limiting & analytics
- [ ] Advanced permission system (RBAC)
- [ ] Multi-language support
- [ ] Export capabilities (PDF, JSON)
- [ ] Integration with third-party services
- [ ] Advanced reporting & analytics
- [ ] Webhook notifications
- [ ] API for third-party clients

---

## 20. Performance Optimization

### 20.1 Current Optimizations

- **Code Splitting**: Angular automatic route-based splitting
- **Lazy Loading**: Routes load only when accessed
- **Change Detection**: OnPush strategy available
- **Tree Shaking**: Unused code removed in production
- **Minification**: Production build minifies & uglifies
- **Caching**: Service Worker caches static assets

### 20.2 Best Practices

- **Virtual Scrolling**: For long lists (if needed)
- **Track-by**: In *ngFor loops
- **RxJS**: Operators for efficient stream processing
- **Async Pipe**: For template subscriptions

---

## 21. Deployment Considerations

### 21.1 Environment Configuration

- **Development**: localhost:4200 with HMR
- **Staging**: WebServices staging URL
- **Production**: Hosted on Express server via server.js

### 21.2 Build Optimization

- Production build with AOT compilation
- Bundle analysis for optimization
- Lazy-loaded feature modules
- Code coverage tracking

### 21.3 Hosting Options

- **Static Hosting**: Firebase Hosting, Netlify, Vercel
- **Container**: Docker for containerized deployment
- **Node.js Server**: Express wrapper for dynamic config
- **CDN**: For static asset distribution

---

## 22. Conclusion

The Interview Resources repository is a comprehensive, modern Angular 19 application providing a rich platform for learning, content management, and professional development. The combination of NgRx state management, Firebase backend services, and PWA capabilities ensures a responsive, offline-capable, and maintainable codebase. The modular architecture supports easy feature addition and scalability for future enhancements.

**Architecture Highlights:**
- ✅ Modern Angular 19 with standalone components
- ✅ NgRx state management with persistent storage
- ✅ Firebase integration for backend services
- ✅ PWA support with offline capability
- ✅ Responsive design with Tailwind CSS
- ✅ Comprehensive service layer
- ✅ Type-safe TypeScript implementation
- ✅ Security measures with authentication guards
- ✅ Modular and scalable design

---

**Document prepared for: Architecture Review & Development Planning**  
**Stakeholders: Development Team, Product Management, DevOps**
