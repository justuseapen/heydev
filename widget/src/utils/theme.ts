/**
 * Theme detection and management for HeyDev Widget
 * Supports auto-detection via prefers-color-scheme and manual override via data-theme attribute
 */

/** Available theme values */
export type Theme = 'light' | 'dark' | 'auto';

/** Resolved theme (light or dark, not auto) */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Light theme CSS custom properties
 */
const LIGHT_THEME = {
  '--heydev-primary': '#6366f1',
  '--heydev-primary-hover': '#4f46e5',
  '--heydev-text': '#1f2937',
  '--heydev-text-secondary': '#6b7280',
  '--heydev-border': '#e5e5e5',
  '--heydev-border-hover': '#d1d5db',
  '--heydev-panel-bg': '#ffffff',
  '--heydev-input-bg': '#ffffff',
  '--heydev-hover-bg': '#f3f4f6',
  '--heydev-btn-secondary-bg': '#f3f4f6',
  '--heydev-btn-secondary-hover': '#e5e7eb',
  '--heydev-danger': '#ef4444',
  '--heydev-danger-hover': '#dc2626',
  '--heydev-badge-bg': '#ef4444',
  '--heydev-badge-text': '#ffffff',
  '--heydev-message-developer-bg': '#f3f4f6',
  '--heydev-success-bg': '#d1fae5',
  '--heydev-success-text': '#065f46',
  '--heydev-error-bg': '#fee2e2',
  '--heydev-error-text': '#991b1b',
};

/**
 * Dark theme CSS custom properties
 */
const DARK_THEME = {
  '--heydev-primary': '#818cf8',
  '--heydev-primary-hover': '#a5b4fc',
  '--heydev-text': '#f9fafb',
  '--heydev-text-secondary': '#9ca3af',
  '--heydev-border': '#374151',
  '--heydev-border-hover': '#4b5563',
  '--heydev-panel-bg': '#1f2937',
  '--heydev-input-bg': '#111827',
  '--heydev-hover-bg': '#374151',
  '--heydev-btn-secondary-bg': '#374151',
  '--heydev-btn-secondary-hover': '#4b5563',
  '--heydev-danger': '#f87171',
  '--heydev-danger-hover': '#fca5a5',
  '--heydev-badge-bg': '#f87171',
  '--heydev-badge-text': '#1f2937',
  '--heydev-message-developer-bg': '#374151',
  '--heydev-success-bg': '#065f46',
  '--heydev-success-text': '#d1fae5',
  '--heydev-error-bg': '#7f1d1d',
  '--heydev-error-text': '#fecaca',
};

/**
 * Check if the user prefers dark mode via media query
 */
export function getSystemPreference(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Resolve a theme setting to an actual theme
 * 'auto' resolves to system preference, otherwise returns the explicit theme
 */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'auto') {
    return getSystemPreference();
  }
  return theme;
}

/**
 * Generate CSS for the specified theme
 */
export function getThemeCSS(theme: ResolvedTheme): string {
  const vars = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
  const entries = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:host {\n${entries}\n}`;
}

/**
 * Generate CSS that responds to prefers-color-scheme
 * This is used when theme is 'auto' for real-time system preference tracking
 */
export function getAutoThemeCSS(): string {
  const lightEntries = Object.entries(LIGHT_THEME)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  const darkEntries = Object.entries(DARK_THEME)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `
:host {
${lightEntries}
}

@media (prefers-color-scheme: dark) {
  :host {
${darkEntries}
  }
}
`;
}

/**
 * Create theme style element for Shadow DOM injection
 */
export function createThemeStyleElement(theme: Theme): HTMLStyleElement {
  const style = document.createElement('style');
  style.id = 'heydev-theme-styles';

  if (theme === 'auto') {
    // Use media query for real-time preference tracking
    style.textContent = getAutoThemeCSS();
  } else {
    // Use explicit theme
    style.textContent = getThemeCSS(theme);
  }

  return style;
}

/** No-op cleanup function */
const noopCleanup = (): void => {
  // Empty cleanup function for unsupported environments
};

/**
 * Watch for system theme changes and call callback when it changes
 * Only useful when theme is set to 'auto' and you need to react to changes
 * Returns a cleanup function to stop watching
 */
export function watchSystemTheme(callback: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return noopCleanup;
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  // Older browsers (deprecated but still needed for some)
  if ('addListener' in mediaQuery) {
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }

  return noopCleanup;
}
