import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = env.VITE_DEV_API_ORIGIN || 'http://127.0.0.1:5000'

  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    port: 3000,
    open: true,
    // Dev: same-origin `/api/*` calls (vendor + some customer fetches) forward to the API.
    proxy: {
      '/api': {
        target: apiOrigin,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            if (id.includes("/src/admin/")) return "admin";
            if (id.includes("/src/vendor/")) return "vendor";
            if (id.includes("/src/customer/pages/Dashboard")) return "customer-account";
            if (id.includes("/src/customer/pages/Checkout")) return "customer-checkout";
            if (id.includes("/src/customer/pages/ProductDetails")) return "customer-pdp";
            return undefined;
          }
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("recharts")) return "charts";
          return "vendor-libs";
        },
      },
    },
  },
  }
})
