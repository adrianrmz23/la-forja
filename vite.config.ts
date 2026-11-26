import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Al terminar el build, escribe en `dist/sw.js` la lista de todos los archivos
 * generados (JS, CSS, íconos) y un identificador de versión. Así el service
 * worker descarga la app completa al instalarse y funciona con internet lento
 * o sin conexión, en lugar de pedir cada pantalla justo cuando se pulsa.
 */
function precacheServiceWorker(): Plugin {
  let outDir = 'dist'

  return {
    name: 'forja-precache-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle(_options, bundle) {
      const swPath = path.resolve(outDir, 'sw.js')

      if (!fs.existsSync(swPath)) {
        return
      }

      const files = Object.keys(bundle)
        .filter((file) => /\.(js|css|svg|png|woff2?)$/.test(file))
        .map((file) => `/${file}`)

      const buildId = Date.now().toString(36)

      const source = fs
        .readFileSync(swPath, 'utf8')
        .replace('"__PRECACHE_URLS__"', JSON.stringify(files))
        .replace('__BUILD_ID__', buildId)

      fs.writeFileSync(swPath, source)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheServiceWorker()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
