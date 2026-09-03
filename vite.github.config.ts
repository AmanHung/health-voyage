import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';

// Separate entry/build: the existing private Sites demonstration is untouched.
export default defineConfig({
  root: 'production',
  base: '/health-voyage/',
  publicDir: '../public',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) }, dedupe: ['react', 'react-dom'] },
  build: { outDir: '../build/github', emptyOutDir: true },
});
