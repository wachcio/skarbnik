import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Lokalny dev bez Dockera: frontend woła względne /api (patrz
    // src/lib/api.ts), Vite przekazuje to do backendu na localhost:4000.
    // W Dockerze/produkcji tę samą ścieżkę przekierowuje NGINX Proxy
    // Manager, więc kod frontendu nie musi się różnić między środowiskami.
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
