import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export interface AuthUser {
  username: string;
  displayName: string;
  avatar: string;
  loginAt: string;
}

const AUTH_KEY = 'auth_session';

// Dummy credentials — replace with real backend auth later
const VALID_CREDENTIALS = {
  username: 'sumanthnagireddi',
  password: 'Sumanth@7327',
  displayName: 'Sumanth Nagireddi',
  avatar: 'SN',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<AuthUser | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());

  constructor(private router: Router) {
    this.loadSession();
  }

  /** Attempt login with username + password. Returns error message or null on success. */
  login(username: string, password: string): string | null {
    if (!username?.trim() || !password?.trim()) {
      return 'Please enter both username and password.';
    }
    if (
      username.trim() !== VALID_CREDENTIALS.username ||
      password !== VALID_CREDENTIALS.password
    ) {
      return 'Invalid username or password.';
    }

    const user: AuthUser = {
      username: VALID_CREDENTIALS.username,
      displayName: VALID_CREDENTIALS.displayName,
      avatar: VALID_CREDENTIALS.avatar,
      loginAt: new Date().toISOString(),
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    return null;
  }

  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private loadSession(): void {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        this.currentUser.set(JSON.parse(raw));
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }
}
