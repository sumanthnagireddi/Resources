import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AccentColor {
  name: string;
  value: string;
  hover: string;
  light: string;
  ring: string;
}

// Enterprise-grade color palette
export const ACCENT_COLORS: AccentColor[] = [
  { name: 'Indigo', value: '#6366f1', hover: '#4f46e5', light: '#e0e7ff', ring: 'ring-indigo-500' },
  { name: 'Blue', value: '#3b82f6', hover: '#2563eb', light: '#dbeafe', ring: 'ring-blue-500' },
  { name: 'Emerald', value: '#10b981', hover: '#059669', light: '#d1fae5', ring: 'ring-emerald-500' },
  { name: 'Violet', value: '#8b5cf6', hover: '#7c3aed', light: '#ede9fe', ring: 'ring-violet-500' },
  { name: 'Rose', value: '#f43f5e', hover: '#e11d48', light: '#ffe4e6', ring: 'ring-rose-500' },
  { name: 'Amber', value: '#f59e0b', hover: '#d97706', light: '#fef3c7', ring: 'ring-amber-500' },
  { name: 'Cyan', value: '#06b6d4', hover: '#0891b2', light: '#cffafe', ring: 'ring-cyan-500' },
  { name: 'Slate', value: '#64748b', hover: '#475569', light: '#f1f5f9', ring: 'ring-slate-500' },
];

const THEME_STORAGE_KEY = 'app-theme-mode';
const ACCENT_STORAGE_KEY = 'app-accent-color';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Reactive signals
  private _themeMode = signal<ThemeMode>(this.getStoredTheme());
  private _accentColor = signal<AccentColor>(this.getStoredAccent());
  private _systemPrefersDark = signal(this.checkSystemPreference());

  // Public readonly signals
  readonly themeMode = this._themeMode.asReadonly();
  readonly accentColor = this._accentColor.asReadonly();
  readonly availableColors = ACCENT_COLORS;

  // Computed: actual dark/light based on mode + system preference
  readonly isDarkMode = computed(() => {
    const mode = this._themeMode();
    if (mode === 'system') {
      return this._systemPrefersDark();
    }
    return mode === 'dark';
  });

  constructor() {
    // Apply theme on initialization
    this.applyTheme();
    this.applyAccentColor();

    // Watch for system preference changes
    this.watchSystemPreference();

    // React to theme changes
    effect(() => {
      this.isDarkMode(); // Subscribe to changes
      this.applyTheme();
    });

    effect(() => {
      this._accentColor(); // Subscribe to changes
      this.applyAccentColor();
    });
  }

  /**
   * Set theme mode (light, dark, or system)
   */
  setThemeMode(mode: ThemeMode): void {
    this._themeMode.set(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    this.applyTheme();
  }

  /**
   * Toggle between light and dark modes
   */
  toggleTheme(): void {
    const current = this._themeMode();
    if (current === 'system') {
      this.setThemeMode(this._systemPrefersDark() ? 'light' : 'dark');
    } else {
      this.setThemeMode(current === 'dark' ? 'light' : 'dark');
    }
  }

  /**
   * Set accent color
   */
  setAccentColor(color: AccentColor): void {
    this._accentColor.set(color);
    localStorage.setItem(ACCENT_STORAGE_KEY, color.name);
    this.applyAccentColor();
  }

  /**
   * Get stored theme from localStorage
   */
  private getStoredTheme(): ThemeMode {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    return stored || 'dark';
  }

  /**
   * Get stored accent color from localStorage
   */
  private getStoredAccent(): AccentColor {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return ACCENT_COLORS.find(c => c.name === stored) || ACCENT_COLORS[0];
  }

  /**
   * Check system color scheme preference
   */
  private checkSystemPreference(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Watch for system preference changes
   */
  private watchSystemPreference(): void {
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        this._systemPrefersDark.set(e.matches);
        if (this._themeMode() === 'system') {
          this.applyTheme();
        }
      });
  }

  /**
   * Apply theme to document
   */
  private applyTheme(): void {
    const isDark = this.isDarkMode();
    const html = document.documentElement;
    const body = document.body;

    if (isDark) {
      html.classList.add('dark');
      body.classList.add('dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      body.classList.remove('dark');
      html.style.colorScheme = 'light';
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
    }
  }

  /**
   * Apply accent color CSS variables
   */
  private applyAccentColor(): void {
    const color = this._accentColor();
    const root = document.documentElement;

    root.style.setProperty('--color-accent', color.value);
    root.style.setProperty('--color-accent-hover', color.hover);
    root.style.setProperty('--color-accent-light', color.light);

    // Also set RGB values for opacity support
    const rgb = this.hexToRgb(color.value);
    if (rgb) {
      root.style.setProperty('--color-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}
