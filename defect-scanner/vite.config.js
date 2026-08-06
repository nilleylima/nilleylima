import { defineConfig } from 'vite'

export default defineConfig({
  // Caminhos relativos: funciona em http://localhost/inspex/ (XAMPP)
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  optimizeDeps: {
    include: ['@tensorflow/tfjs', '@tensorflow-models/mobilenet'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    outDir: 'dist',
    emptyOutDir: true,
  },
})
