import { defineConfig } from 'vite';

/**
 * `npm run build:functions`: bundles the push-notification moments (and the
 * scoring engine they use) into one plain JavaScript file the Supabase Edge
 * Function imports, so the server judges wickets and results with exactly the
 * same rules as the app. CI fails if the committed copy is out of date.
 */
export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: 'src/push/moments.ts',
      formats: ['es'],
      fileName: () => 'moments.js',
    },
    outDir: 'supabase/functions/_shared',
    emptyOutDir: false,
    minify: false,
    reportCompressedSize: false,
  },
});
