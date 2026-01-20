import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * These tests ensure widget installation URLs remain correct.
 *
 * The widget should be served from heydev.io (main domain),
 * NOT from cdn.heydev.io or cdn.heydev.co (non-existent CDN subdomains).
 */

const CORRECT_WIDGET_URL = 'https://heydev.io/widget.js';
const INVALID_PATTERNS = [
  'cdn.heydev.io',
  'cdn.heydev.co',
  'cdn.heydev.com',
];

describe('Widget Installation URLs', () => {
  const filesToCheck = [
    'src/components/SetupWizard.tsx',
    'src/pages/LandingPage.tsx',
    'src/pages/SetupPage.tsx',
  ];

  it.each(filesToCheck)('should use correct widget URL in %s', (filePath) => {
    const fullPath = join(__dirname, '../../', filePath);
    const content = readFileSync(fullPath, 'utf-8');

    // Check that the correct URL is present
    expect(content).toContain(CORRECT_WIDGET_URL);

    // Check that invalid CDN URLs are not present
    for (const invalidPattern of INVALID_PATTERNS) {
      expect(content).not.toContain(invalidPattern);
    }
  });

  it('should not have any CDN subdomain references in dashboard source', () => {
    const srcDir = join(__dirname, '../');
    const filesToScan = [
      'components/SetupWizard.tsx',
      'pages/LandingPage.tsx',
      'pages/SetupPage.tsx',
    ];

    for (const file of filesToScan) {
      const content = readFileSync(join(srcDir, file), 'utf-8');

      for (const invalidPattern of INVALID_PATTERNS) {
        if (content.includes(invalidPattern)) {
          throw new Error(
            `Found invalid CDN URL pattern "${invalidPattern}" in ${file}. ` +
            `Widget should be served from ${CORRECT_WIDGET_URL}`
          );
        }
      }
    }
  });
});
