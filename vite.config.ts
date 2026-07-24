import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/die-umwerfenden/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Die Umwerfenden',
        short_name: 'Umwerfenden',
        description:
          'Digitales, physikbasiertes Kegelspiel – originalgetreue Nachbildung der Outdoor-Kegelbahn Lembeck',
        theme_color: '#2E5B3E',
        background_color: '#7EC8E3',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/die-umwerfenden/',
        scope: '/die-umwerfenden/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,woff2,mp3,ogg}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
})
