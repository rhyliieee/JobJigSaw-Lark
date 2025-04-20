import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
// import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(async () => {
  // Use dynamic import for the ESM-only package
  const tailwindcss = (await import('@tailwindcss/vite')).default;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
