import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base: './'` permite desplegar en GitHub Pages (subruta) o en cualquier hosting estático.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // El motor de daño y React cambian poco: chunks separados aprovechan la caché del navegador
        manualChunks: { calc: ['@smogon/calc'], react: ['react', 'react-dom'] },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
