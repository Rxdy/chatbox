import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    server: {
        host: true,
        port: 5173,

        hmr: {
            protocol: "ws",
            host: "localhost",
            port: 5173,
        },
        watch: {
            usePolling: true,
            interval: 1000,
            binaryInterval: 3000,
        },
    },
});
