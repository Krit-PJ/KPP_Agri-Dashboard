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
        manualChunks:{
          charts:["echarts/core","echarts/charts","echarts/components","echarts/renderers"],
          react:["react","react-dom"],
        },
      },
    },
  },
});
