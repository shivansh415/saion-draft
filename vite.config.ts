import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    compression({ include: /\.(js|css|html|svg|json)(\?.*)?$/i }),
  ],
  build: {
    rollupOptions: {
      output: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        manualChunks(id: string): string | undefined {
          if (id.includes('gsap')) return 'vendor-gsap'
          if (id.includes('lenis')) return 'vendor-lenis'
          return undefined
        },
      },
    },
    // Inline assets smaller than 8 KB to reduce network requests
    assetsInlineLimit: 8192,
  },
})
