import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // rutas relativas: funciona en GitHub Pages (/nuestra-independencia/) y en local
  base: './',
  plugins: [react(), tailwindcss()],
})
