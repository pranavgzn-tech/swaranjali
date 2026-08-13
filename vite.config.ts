import { defineConfig } from 'vite';

/** Shown in settings; five taps on it opens the diagnostics panel (doc 12). */
const BUILD_ID = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  // Relative base: the app is served from a GitHub Pages subpath, and the
  // manifest's start_url and scope are relative for the same reason (doc 12).
  base: './',
  build: {
    // Safari 16.4 is the floor: it is what an iPad Air 10.9" and the target
    // iPhones run once updated, and it has everything we use.
    target: 'safari16',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  server: {
    host: true,
  },
});
