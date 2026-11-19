import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src',
  base: './',
  publicDir: '../public',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'pages-assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith('/generation/classical-signatures.ts')) return 'classical-payout-data'
        },
      },
    },
  },
})
