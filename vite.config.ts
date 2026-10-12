import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-inspector-sync',
      configureServer(server) {
        server.middlewares.use('/__dev_inspector_sync', (req, res) => {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                fs.writeFileSync('.dev_selected_element.json', body, 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true }))
              } catch (e: any) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          } else {
            res.statusCode = 404
            res.end()
          }
        })
      }
    },
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
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // 5MB limit
      }
    })
  ],
  server: {
    port: 5175,
    strictPort: true,
    host: true,
  },
})
