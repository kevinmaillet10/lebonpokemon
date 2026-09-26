// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});