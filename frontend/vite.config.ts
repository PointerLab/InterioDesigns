import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Django dev server. /api, /media and /admin are proxied so the browser only
  // ever talks to one origin (no CORS setup needed, and tunnels like ngrok work).
  const backend = env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  const proxy = Object.fromEntries(["/api", "/media", "/admin", "/static"].map((prefix) => [prefix, backend]));

  return {
    server: {
      host: true,
      port: 8085,
      allowedHosts: true,
      proxy,
    },
    preview: {
      port: 8085,
      proxy,
    },
    build: {
      rollupOptions: {
        output: {
          // Vendor code changes rarely, so keep it in separately cached files.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            query: ["@tanstack/react-query"],
            motion: ["framer-motion"],
            radix: [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tooltip",
            ],
          },
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
