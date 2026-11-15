import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    solid({
      ssr: true,
      include: [
        /\.[mc]?[jt]sx$/,
        /@tanstack\/solid-(router|start)\//,
        /solid-icons\//,
      ],
    }),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,wasm}"],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
      manifest: {
        name: "Learn Robotics",
        short_name: "LearnRobotics",
        description: "Learn robotics in the browser.",
        theme_color: "#121212",
        background_color: "#fffbfc",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "~": "/src",
    },
  },
  optimizeDeps: {
    exclude: ["solid-icons", "solid-icons/md", "solid-icons/ai"],
  },
  ssr: {
    noExternal: [
      "solid-icons",
      /@tanstack\/solid-(router|start)/,
    ],
  },
  environments: {
    ssr: {
      optimizeDeps: {
        exclude: ["solid-icons", "solid-icons/md", "solid-icons/ai"],
      },
    },
  },
});
