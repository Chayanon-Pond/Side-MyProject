import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Lazy route chunks the boot script modulepreloads on a cold load of that route. */
const ROUTE_ENTRIES = { article: 'src/features/articles/detail/ArticleDetailPage.jsx' }

/** Chunk file of a route plus every chunk it statically imports (minus what the entry already loads). */
function routeChunkFiles(bundle, entrySuffix) {
  const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
  const entry = chunks.find((c) => c.isEntry)
  const loaded = new Set(entry ? [entry.fileName, ...entry.imports] : [])
  const start = chunks.find((c) => c.facadeModuleId?.replace(/\\/g, '/').endsWith(entrySuffix))
  if (!start) return []
  const out = []
  const visit = (file) => {
    if (loaded.has(file) || out.includes(`/${file}`)) return
    out.push(`/${file}`)
    bundle[file]?.imports?.forEach(visit)
  }
  visit(start.fileName)
  return out
}

/**
 * index.html's boot script (see the comment there) gets the bundled-photo manifest and, in
 * builds, the hashed chunk names of the lazy routes it preloads.
 */
const bootScriptData = () => ({
  name: 'apex-boot-script-data',
  transformIndexHtml(html, ctx) {
    const manifest = fs.readFileSync(new URL('./src/lib/localImages.json', import.meta.url), 'utf8')
    const routes = {}
    if (ctx?.bundle) {
      for (const [name, suffix] of Object.entries(ROUTE_ENTRIES)) routes[name] = routeChunkFiles(ctx.bundle, suffix)
    }
    return html
      .replace('__APEX_LOCAL_IMAGES__', JSON.stringify(JSON.parse(manifest)))
      .replace('__APEX_ROUTE_CHUNKS__', JSON.stringify(routes))
  },
})

/**
 * Build only: the entry chunk is still downloaded right away (modulepreload), but evaluated once
 * the boot script's early cover photo has painted (window.__APEX_BOOT_WAIT__, capped at 1.2 s).
 * The app cannot show anything useful before that data anyway, and evaluating ~440 KB of JS first
 * would keep the main thread from painting the photo (mobile LCP).
 */
const deferEntryUntilBootPaint = () => ({
  name: 'apex-defer-entry',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      return html.replace(
        /<script type="module" crossorigin src="([^"]+)"><\/script>/,
        (_, src) =>
          `<link rel="modulepreload" crossorigin href="${src}">\n` +
          `    <script type="module">var go=function(){import(${JSON.stringify(src)})};var w=window.__APEX_BOOT_WAIT__;` +
          `if(w){Promise.race([w,new Promise(function(r){setTimeout(r,1200)})]).then(go,go)}else{go()}</script>`,
      )
    },
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bootScriptData(), deferEntryUntilBootPaint()],
  server: {
    proxy: {
      // API requests during dev will be proxied to backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Also proxy uploaded files served by Express
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
