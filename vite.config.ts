import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Community Noticeboard',
        short_name: 'Noticeboard',
        description: 'Our digital community hub',
        theme_color: '#2563eb', // Matches your blue header
        background_color: '#ffffff',
        display: 'standalone', // This removes the browser address bar!
        icons: [
          {
            // Using a temporary React logo for your app icon
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});