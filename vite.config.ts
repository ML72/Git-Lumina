import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/Git-Lumina/",
  server: {
    open: true
  },
  build: {
    outDir: 'build',
  },
});
