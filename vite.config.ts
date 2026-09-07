import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Gzip — broad CDN support
    compression({
      algorithms: ['gzip'],
      include: /\.(js|css|html|svg|json)(\?.*)?$/i,
    }),
    // Brotli — 20-30% smaller than gzip; supported by every modern browser + CDN
    compression({
      algorithms: ['brotliCompress'],
      include: /\.(js|css|html|svg|json)(\?.*)?$/i,
    }),
  ],
  build: {
    // Target modern ES2020: smaller output, no legacy polyfill bloat.
    // All browsers that can render this cinematic experience support it.
    target: 'es2020',
    // Skip computing gzip sizes in the build report — saves ~2s on large bundles.
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        manualChunks(id: string): string | undefined {
          // Heavy animation libraries — fetched once and cached independently
          if (id.includes('gsap')) return 'vendor-gsap'
          if (id.includes('lenis')) return 'vendor-lenis'
          // React runtime — long-lived cache, never changes between deploys
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
    // Inline assets smaller than 8 KB to reduce network requests
    assetsInlineLimit: 8192,
    // Minify CSS with esbuild (default, fast)
    cssMinify: true,
  },
})

