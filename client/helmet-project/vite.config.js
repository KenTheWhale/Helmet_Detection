import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // This line removes all "Failed to parse source map" warnings
  // (including the long lucide-react ones you're seeing)
  build: {
    sourcemap: false, // Recommended: stops trying to load missing .map files
  },

  // Alternative (if you want to keep source maps but hide warnings):
  // clearScreen: false,
  // server: {
  //   watch: {
  //     ignored: ['**/node_modules/**'],
  //   },
  // },
});