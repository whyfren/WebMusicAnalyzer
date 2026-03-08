import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/WebMusicAnalyzer/",
  optimizeDeps: {
    exclude: ["essentia.js"],
  },
  plugins: [react()],
});