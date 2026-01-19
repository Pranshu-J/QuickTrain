import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,       // Force this port
    strictPort: true, // If 5173 is busy, Vite will exit instead of switching to 5174
    host: true
}})
