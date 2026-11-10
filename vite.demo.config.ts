import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  envDir: './public',
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': '""',
  },
})
