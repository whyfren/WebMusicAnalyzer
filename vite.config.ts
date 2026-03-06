import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/WebMusicAnalyzer/",
  optimizeDeps: {
    exclude: ['essentia.js']  // don't pre-bundle WASM modules
  }
})


