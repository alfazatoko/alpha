import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo_icon.png', 'icons.svg'],
      manifest: {
        name: 'AlfazaCell',
        short_name: 'AlfazaCell',
        description: 'AlfazaCell',
        theme_color: '#005daa',
        orientation: 'any',
        icons: [
          {
            src: 'logo_icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo_icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo_icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5175,
    strictPort: true,
  },
})
