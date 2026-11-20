import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import mdx from "@mdx-js/rollup";
import { mdRaw } from "./vite-plugins/md-raw";
import { watchContent } from "./vite-plugins/watch-content";

export default defineConfig({
  // BetterAuth is configured against http://localhost:5173 — pin the dev
  // server so cookies/redirects work. If 5173 is taken, fail fast rather
  // than silently drift to 5174 and break login.
  server: {
    port: 5173,
    strictPort: true,
  },
  assetsInclude: ["**/*.md"],
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({ customViteSolidPlugin: true }),
    mdRaw(),
    watchContent(),
    {
      enforce: "pre",
      ...mdx({
        jsx: true,
        providerImportSource: "@learnrobotics/editor/mdx-provider",
      }),
    },
    solid({ ssr: true, extensions: [".mdx"] }),
    tailwindcss(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      outputStructure: "message-modules",
      emitTsDeclarations: true,
      cookieName: "PARAGLIDE_LOCALE",
      strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
      urlPatterns: [
        {
          pattern: "/:path(.*)?",
          localized: [
            ["pirate", "/pirate/:path(.*)?"],
            ["en", "/en/:path(.*)?"],
          ],
        },
      ],
    }),
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
  worker: {
    // The code-runner worker uses dynamic imports (bundle staging lazy-loads
    // preview2-shim/filesystem); Rollup refuses IIFE/UMD for code-splitting.
    format: "es",
  },
  optimizeDeps: {
    exclude: ["solid-icons", "solid-icons/md", "solid-icons/ai"],
  },
  ssr: {
    noExternal: [
      "solid-icons",
      "@learnrobotics/db",
      "@learnrobotics/editor",
      "@learnrobotics/events",
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
