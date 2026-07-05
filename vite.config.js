import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Ground0: Cloud backend — Go (go-server/, npm run goserver) has full
      // parity with the legacy Express server (server/, npm run server) as
      // of Phase 1, so everything routes there now.
      '/api': 'http://localhost:4100',
    },
  },
})
