import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// One codebase, two apps. Mode "curaah" or "careconnect" picks the app.
export default defineConfig(({ mode }) => {
  const care = mode === 'careconnect'
  const icon = care ? 'careconnect' : 'curaah'
  return {
    build: { outDir: `dist-${icon}` },
    server: { port: care ? 5174 : 5173, host: true },
    preview: { port: care ? 4174 : 4173, host: true },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: care ? 'Curaah Careconnect' : 'Curaah',
          short_name: care ? 'Careconnect' : 'Curaah',
          description: care
            ? 'Coordinate with volunteers, blood banks and health professionals.'
            : 'Your health, your community, and help when it matters.',
          theme_color: care ? '#2f3f8f' : '#1e7f5c',
          background_color: '#f3f7f5',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: `/${icon}-192.png`, sizes: '192x192', type: 'image/png' },
            { src: `/${icon}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: { navigateFallback: '/index.html' },
      }),
    ],
  }
})
