import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const plugins: any[] = [react(), tailwindcss()];
  if (process.env.ANALYZE === '1') {
    plugins.push(visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true, brotliSize: true }));
  }
  return {
    base: './',
    plugins,
    define: {
      // Server-only keys are read in /api/* via process.env. Anything exposed
      // to the client MUST be prefixed with VITE_.
    },
    resolve: {
      alias: { '@/*': path.resolve(__dirname, './*') },
    },
    server: { hmr: process.env.DISABLE_HMR !== 'true' },
    css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'motion-vendor': ['motion'],
            'icons-vendor': ['lucide-react'],
            'supabase-vendor': ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
