import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  base: '/',
  resolve: { alias: { 'react-router-dom': path.resolve(import.meta.dirname, 'src/router.jsx') } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    clearMocks: true,
    include: ['src/**/*.test.{js,jsx}'],
  },
})
