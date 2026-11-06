import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET

  return {
    plugins: [react()],
    server: {
      proxy: apiProxyTarget
        ? {
            '/backend': {
              target: apiProxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/backend/, ''),
            },
          }
        : undefined,
    },
  }
})
