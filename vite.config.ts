import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@tanstack/react-query', '@tanstack/react-query-devtools'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
