import type { NextConfig } from 'next'

import { leerEntornoPublico } from './src/shared/config/entorno'
import {
  esquemaPublico,
  mensajeDeProblemas,
  problemasDe,
  validaLaCompilacion,
} from './src/shared/config/esquemas'

const nextConfig: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
  distDir: process.env['NEXT_DIST_DIR'] ?? '.next',
  // Con Cache Components, los proyectos nuevos activan también Partial Prefetching (lo pide Next 16.4).
  partialPrefetching: true,
  experimental: { typedEnv: true },
  // El servidor de desarrollo imprime cada Server Action con sus argumentos: la clave temporal del
  // portal (y cualquier dato que viaje en una action) quedaría en la terminal. No hay forma de
  // silenciar una sola (docs/DECISIONES.md, 2026-10-15).
  logging: { serverFunctions: false },
  // Tailwind 4 con Turbopack: sin esta regla nadie procesa `@import 'tailwindcss'` (no hay PostCSS).
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  images: {
    formats: ['image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  headers() {
    return Promise.resolve([
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ])
  },
}

// El build cae si falta una variable pública: quedaría incrustada vacía en el JS del navegador (docs/ENTORNOS.md). Sólo al compilar:
// el desarrollo y `next typegen` (pnpm typecheck, que llega con la misma fase que el build) también leen este archivo y no las necesitan.
export default function configuracion(fase: string): NextConfig {
  if (validaLaCompilacion(fase, process.argv)) {
    const problemas = problemasDe(esquemaPublico, leerEntornoPublico())
    if (problemas.length > 0)
      throw new Error(mensajeDeProblemas('la compilación (públicas)', problemas))
  }
  return nextConfig
}
