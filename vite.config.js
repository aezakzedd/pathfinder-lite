import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5174, // Different port to avoid conflict with main project
    strictPort: false,
    watch: {
      ignored: ['**/node_modules/**']
    }
  },
  build: {
    target: 'es2015',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false
  }
})
