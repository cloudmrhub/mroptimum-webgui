import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/

export default defineConfig({
  base: "/",
  plugins: [react()],
  // Ensure linked/local packages resolve to the single React/Emotion instances
  resolve: {
    alias: [
      { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react') },
      { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom') },
      { find: '@emotion/react', replacement: path.resolve(__dirname, 'node_modules/@emotion/react') },
      { find: '@emotion/styled', replacement: path.resolve(__dirname, 'node_modules/@emotion/styled') },
    ],
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["import", "color-functions", "global-builtin"],
      },
    },
  },
});
