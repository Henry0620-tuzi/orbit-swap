import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative assets let the same build run at a GitHub Pages project URL.
  base: './',
  server: { port: 5173, proxy: { '/api': 'http://localhost:8787' } },
})
