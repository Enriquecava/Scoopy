import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../',
  server: {
    host: '0.0.0.0',
    port: 5137,
    strictPort: true,
    hmr: {
      host: 'localhost',
    },
  },
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', '@tanstack/react-query', 'axios', 'lucide-react'],
  },
})
