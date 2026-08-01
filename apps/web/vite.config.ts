import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins:[react()],
  // Relative assets work on GitHub Pages regardless of the repository name.
  base:"./",
  build:{
    sourcemap:true,
    chunkSizeWarningLimit:700,
    rollupOptions:{
      output:{
        manualChunks(id){
          if (id.includes("/echarts/")) return "charts";
          if (id.includes("/react/") || id.includes("/react-dom/")) return "react";
          if (id.endsWith("/crop-annual.json")) return "snapshot";
        },
      },
    },
  },
});
