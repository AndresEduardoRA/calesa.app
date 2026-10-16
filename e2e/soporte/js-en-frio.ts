// El JS en frío de una pantalla: la suma de los `.js` de `/_next/static` que el documento nombra (los
// `<script>` y los `<link rel="preload">` de su HTML completo), comprimidos con gzip y pedidos sin
// caché. Es lo que paga quien llega por primera vez a esa pantalla. No cuenta lo que Next prefetchea de
// las demás rutas ni lo que se pide al interactuar (un `import()` diferido): por eso `/perfil` no suma
// lo de `/leads`. Mide el build de `.next-e2e` (`pnpm test:e2e`), no el servidor de desarrollo.
import { gzipSync } from 'node:zlib'
import type { BrowserContext } from '@playwright/test'

export type JsEnFrio = {
  bytes: number
  chunks: number
  detalle: readonly { url: string; bytes: number }[]
}

export const enKB = (bytes: number): number => Math.round((bytes / 1024) * 10) / 10

const RUTA_DE_JS = /\/_next\/static\/[^"'\s\\<>]+?\.js/g

export async function medirJsEnFrio(contexto: BrowserContext, ruta: string): Promise<JsEnFrio> {
  const documento = await contexto.request.get(ruta)
  const urls = [...new Set((await documento.text()).match(RUTA_DE_JS) ?? [])]
  const detalle = await Promise.all(
    urls.map(async (url) => {
      const respuesta = await contexto.request.get(url)
      return { url, bytes: gzipSync(await respuesta.body(), { level: 9 }).length }
    }),
  )
  detalle.sort((a, b) => b.bytes - a.bytes)
  return { bytes: detalle.reduce((suma, d) => suma + d.bytes, 0), chunks: detalle.length, detalle }
}
