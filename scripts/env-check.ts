// `pnpm env:check [local|demo|produccion]`: qué falta en cada entorno, sin imprimir nunca un valor. `local` y `demo` leen los archivos sin
// cargarlos en el proceso: `.env.local` (la app: públicas y del servidor) y `.env.demo` (lo que leen scripts/demo/*.sh). `produccion` lee por
// API los nombres de Vercel y Supabase (hay que pedirlo por nombre; salida 2 si algún lugar no se pudo leer). docs/ENTORNOS.md.
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

import { codigoDeSalida, informeDeProduccion, revisarProduccion } from './lib/entornos/produccion'

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

const leerArchivo = (archivo: string) =>
  existsSync(archivo) ? readFileSync(archivo, 'utf8') : null

async function deProduccion(): Promise<number> {
  const lugares = await revisarProduccion({
    env: process.env,
    configToml: leerArchivo('supabase/config.toml'),
    pedir: (url, init) => fetch(url, init),
  })
  process.stdout.write(`${informeDeProduccion(lugares)}\n`)
  return codigoDeSalida(lugares)
}

async function principal(): Promise<void> {
  const pedidos = process.argv.slice(2)
  const locales = pedidos.filter((e) => e !== 'produccion')
  const entornos = pedidos.length > 0 ? locales : Object.keys(ENTORNOS)
  const revisiones = entornos.map((e) => revisar(e, leerArchivo))
  for (const r of revisiones) process.stdout.write(`${informe(r)}\n`)
  // Falla si un archivo existe y está incompleto, o si se pidió un entorno por nombre y su archivo no existe.
  const falla = revisiones.some((r) => r.problemas.length > 0 || (!r.existe && pedidos.length > 0))
  const produccion = pedidos.includes('produccion') ? await deProduccion() : 0
  process.exit(produccion === 2 ? 2 : falla || produccion === 1 ? 1 : 0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void principal()
}
