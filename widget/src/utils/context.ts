/**
 * Context capture utility for HeyDev widget
 * Captures page context automatically for feedback submissions
 */

/**
 * Context object structure captured for feedback
 */
export interface PageContext {
  /** Current page URL */
  url: string;
  /** Browser name and version */
  browser: string;
  /** Operating system name */
  os: string;
  /** Viewport dimensions */
  viewport: { width: number; height: number };
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Timezone name (e.g., "America/New_York") */
  timezone: string;
}

/**
 * Parse browser name and version from user agent string
 */
function parseBrowser(userAgent: string): string {
  // Order matters - check more specific browsers first
  const browsers: { name: string; pattern: RegExp }[] = [
    { name: 'Edge', pattern: /Edg\/(\d+(?:\.\d+)*)/ },
    { name: 'Opera', pattern: /(?:OPR|Opera)\/(\d+(?:\.\d+)*)/ },
    { name: 'Chrome', pattern: /Chrome\/(\d+(?:\.\d+)*)/ },
    { name: 'Safari', pattern: /Version\/(\d+(?:\.\d+)*).*Safari/ },
    { name: 'Firefox', pattern: /Firefox\/(\d+(?:\.\d+)*)/ },
  ];

  for (const { name, pattern } of browsers) {
    const match = userAgent.match(pattern);
    if (match) {
      return `${name} ${match[1]}`;
    }
  }

  return 'Unknown Browser';
}

/**
 * Parse operating system from user agent string
 */
function parseOS(userAgent: string): string {
  // Check for mobile platforms first
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    const match = userAgent.match(/OS (\d+[_\d]*)/);
    if (match) {
      return `iOS ${match[1].replace(/_/g, '.')}`;
    }
    return 'iOS';
  }

  if (/Android/.test(userAgent)) {
    const match = userAgent.match(/Android (\d+(?:\.\d+)*)/);
    if (match) {
      return `Android ${match[1]}`;
    }
    return 'Android';
  }

  // Desktop platforms
  if (/Windows/.test(userAgent)) {
    if (/Windows NT 10/.test(userAgent)) {
      return 'Windows 10/11';
    }
    if (/Windows NT 6\.3/.test(userAgent)) {
      return 'Windows 8.1';
    }
    if (/Windows NT 6\.2/.test(userAgent)) {
      return 'Windows 8';
    }
    if (/Windows NT 6\.1/.test(userAgent)) {
      return 'Windows 7';
    }
    return 'Windows';
  }

  if (/Mac OS X/.test(userAgent)) {
    const match = userAgent.match(/Mac OS X (\d+[_\d]*)/);
    if (match) {
      return `macOS ${match[1].replace(/_/g, '.')}`;
    }
    return 'macOS';
  }

  if (/Linux/.test(userAgent)) {
    return 'Linux';
  }

  if (/CrOS/.test(userAgent)) {
    return 'Chrome OS';
  }

  return 'Unknown OS';
}

/**
 * Captures the current page context for feedback submission
 * @returns PageContext object with url, browser, os, viewport, timestamp, and timezone
 */
export function captureContext(): PageContext {
  const userAgent = navigator.userAgent;

  return {
    url: window.location.href,
    browser: parseBrowser(userAgent),
    os: parseOS(userAgent),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
