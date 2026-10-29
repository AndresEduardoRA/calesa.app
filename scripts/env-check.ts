// `pnpm env:check [local|demo]`: qué falta en cada entorno local, sin imprimir nunca un valor. Lee los archivos sin cargarlos en el
// proceso: `.env.local` (la app: públicas y del servidor) y `.env.demo` (lo que leen scripts/demo/*.sh). Vercel y Supabase no se leen
// por API todavía (abierto en docs/PLAN.md). Qué es cada variable y dónde vive: docs/ENTORNOS.md.
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { pathToFileURL } from 'node:url'

import type { z } from 'zod'

import {
  esquemaDeLaDemo,
  esquemaDelServidor,
  esquemaPublico,
  problemasDe,
  type Problema,
} from '../src/shared/config/esquemas'

export type Revision = { entorno: string; archivo: string; existe: boolean; problemas: Problema[] }

const ENTORNOS: Record<string, { archivo: string; esquemas: z.ZodType[] }> = {
  local: { archivo: '.env.local', esquemas: [esquemaPublico, esquemaDelServidor] },
  demo: { archivo: '.env.demo', esquemas: [esquemaDeLaDemo] },
}

export function revisar(entorno: string, leer: (archivo: string) => string | null): Revision {
  const definicion = ENTORNOS[entorno]
  if (!definicion)
    throw new Error(`entorno desconocido: ${entorno} (${Object.keys(ENTORNOS).join(', ')})`)
  const texto = leer(definicion.archivo)
  if (texto === null) return { entorno, archivo: definicion.archivo, existe: false, problemas: [] }
  const valores = parseEnv(texto)
  const problemas = definicion.esquemas.flatMap((e) => problemasDe(e, valores))
  return { entorno, archivo: definicion.archivo, existe: true, problemas }
}

export function informe(r: Revision): string {
  if (!r.existe) return `· ${r.entorno}: no hay ${r.archivo}`
  if (r.problemas.length === 0) return `✓ ${r.entorno} (${r.archivo}): completo`
  return [
    `✗ ${r.entorno} (${r.archivo}):`,
    ...r.problemas.map((p) => `    ${p.variable}: ${p.motivo}`),
  ].join('\n')
}

function principal(): void {
  const pedidos = process.argv.slice(2)
  const entornos = pedidos.length > 0 ? pedidos : Object.keys(ENTORNOS)
  const leer = (archivo: string) => (existsSync(archivo) ? readFileSync(archivo, 'utf8') : null)
  const revisiones = entornos.map((e) => revisar(e, leer))
  for (const r of revisiones) process.stdout.write(`${informe(r)}\n`)
  // Falla si un archivo existe y está incompleto, o si se pidió un entorno por nombre y su archivo no existe.
  const falla = revisiones.some((r) => r.problemas.length > 0 || (!r.existe && pedidos.length > 0))
  process.exit(falla ? 1 : 0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal()
}
