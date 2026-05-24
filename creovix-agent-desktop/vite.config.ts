import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

const bootErrorScript = `<script>
window.__jarviceShowError=function(m){var r=document.getElementById("root");if(r)r.innerHTML='<pre style="color:#fecaca;background:#1a1d27;padding:16px;white-space:pre-wrap;font-family:Segoe UI,sans-serif">'+m+"</pre>";};
window.addEventListener("error",function(e){__jarviceShowError("Ошибка: "+e.message);});
window.addEventListener("unhandledrejection",function(e){__jarviceShowError("Ошибка: "+String(e.reason));});
</script>`;

export default defineConfig({
  // Relative asset paths for Tauri release (tauri:// / asset protocol).
  base: "./",
  plugins: [
    react(),
    {
      name: "tauri-html-fixups",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          let out = html.replace(/\s+crossorigin/g, "");
          out = out.replace(/src="\/assets\//g, 'src="./assets/');
          out = out.replace(/href="\/assets\//g, 'href="./assets/');
          return out.replace("</head>", `${bootErrorScript}</head>`);
        },
      },
    },
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows"
        ? "chrome105"
        : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    modulePreload: { polyfill: false },
  },
});
