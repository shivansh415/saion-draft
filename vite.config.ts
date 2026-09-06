import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip', threshold: 1024 }),
    compression({ algorithm: 'brotliCompress', threshold: 1024 }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-gsap': ['gsap', 'gsap/ScrollTrigger'],
          'vendor-lenis': ['lenis'],
        },
      },
    },
    // Inline assets smaller than 8 KB to reduce network requests
    assetsInlineLimit: 8192,
  },
})
