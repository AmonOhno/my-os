/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' + HashRouter で GitHub Pages のサブパス配信に対応する
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MyOS',
        short_name: 'MyOS',
        description: '自分を理解するための、人生のOS。',
        lang: 'ja',
        display: 'standalone',
        theme_color: '#faf6ef',
        background_color: '#faf6ef',
        icons: [],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
