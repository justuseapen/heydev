import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
  },
  build: {
    // Library mode configuration
    lib: {
      // Entry point for the widget
      entry: resolve(__dirname, 'src/widget.ts'),
      // Output name for the bundle
      name: 'HeyDev',
      // Output as IIFE for direct script tag inclusion
      formats: ['iife'],
      // Output filename
      fileName: () => 'widget.js',
    },
    // Output directory
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: true,
    // Minify for production using esbuild (built into Vite)
    minify: 'esbuild',
    // Bundle size optimization
    rollupOptions: {
      // html2canvas is loaded from CDN at runtime, not bundled
      external: ['html2canvas'],
      output: {
        // Ensure CSS is inlined (no external CSS file)
        // For IIFE, we don't need to worry about exports
        inlineDynamicImports: true,
        // Compact output
        compact: true,
      },
    },
    // Inline all CSS into JavaScript
    cssCodeSplit: false,
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Empty outDir before building
    emptyOutDir: true,
  },
  // CSS configuration - inline CSS as JS
  css: {
    // Ensure CSS is processed and can be inlined
    devSourcemap: true,
  },
});
