// `pnpm env:check produccion`: qué falta en Vercel (producción y preview) y en Supabase (secretos de las funciones y Auth), leído por API.
// Sólo nombres: ningún valor llega a un tipo de aquí. Los tokens vienen del entorno del proceso y nunca se imprimen. docs/ENTORNOS.md.
import type { z } from 'zod'

import {
  esquemaDeAuth,
  esquemaDeLasFunciones,
  esquemaDePreview,
  esquemaDeProduccion,
  problemasDe,
  type Problema,
} from '../../../src/shared/config/esquemas'

import type { Lectura, Pedir } from './lectura'
import { leerAuth, leerSecretosDeLasFunciones } from './supabase'
import { leerVariablesDeVercel, type VariablesDeVercel } from './vercel'

export type Lugar = {
  lugar: string
  estado: 'completo' | 'falta' | 'no_se_pudo_leer'
  problemas: Problema[]
  motivo?: string
}

export type Entrada = {
  env: Record<string, string | undefined>
  configToml: string | null
  pedir: Pedir
}

const LUGARES = {
  produccion: 'Vercel · producción',
  preview: 'Vercel · preview',
  funciones: 'Funciones de Supabase · secretos',
  auth: 'Auth de Supabase',
} as const

const nombres = (lista: readonly string[]) =>
  Object.fromEntries(lista.map((n) => [n, 'presente'] as const))

function lugarDe(
  lugar: string,
  lectura: Lectura<Record<string, string>>,
  esquema: z.ZodType,
): Lugar {
  if (!lectura.ok)
    return { lugar, estado: 'no_se_pudo_leer', problemas: [], motivo: lectura.motivo }
  const problemas = problemasDe(esquema, lectura.datos)
  return { lugar, estado: problemas.length === 0 ? 'completo' : 'falta', problemas }
}

const sinLeer = (falta: string): Lectura<never> => ({ ok: false, motivo: `falta ${falta}` })

const valor = (env: Entrada['env'], clave: string) => env[clave]?.trim() || undefined

function deVercelPor({ env, pedir }: Entrada): Promise<Lectura<VariablesDeVercel>> {
  const token = valor(env, 'VERCEL_TOKEN')
  const proyecto = valor(env, 'VERCEL_PROJECT_ID')
  if (!token) return Promise.resolve(sinLeer('VERCEL_TOKEN'))
  if (!proyecto) return Promise.resolve(sinLeer('VERCEL_PROJECT_ID'))
  return leerVariablesDeVercel({ pedir, token, proyecto, equipo: valor(env, 'VERCEL_TEAM_ID') })
}

// Las dos lecturas de Supabase piden lo mismo: el token y el ref del proyecto.
function deSupabasePor<T>(
  { env, configToml, pedir }: Entrada,
  leer: (a: { pedir: Pedir; token: string; ref: string }) => Promise<Lectura<T>>,
): Promise<Lectura<T>> {
  const token = valor(env, 'SUPABASE_ACCESS_TOKEN')
  const ref = refDeSupabase(env, configToml)
  if (!token) return Promise.resolve(sinLeer('SUPABASE_ACCESS_TOKEN'))
  if (!ref) return Promise.resolve(sinLeer('SUPABASE_PROJECT_REF'))
  return leer({ pedir, token, ref })
}

// El ref del proyecto de Supabase no es secreto: de `SUPABASE_PROJECT_REF` o de `[remotes.demo] project_id` de config.toml.
export function refDeSupabase(env: Entrada['env'], configToml: string | null): string | undefined {
  const dado = valor(env, 'SUPABASE_PROJECT_REF')
  if (dado) return dado
  return configToml?.match(/\[remotes\.demo\][^[]*?project_id\s*=\s*"([^"]+)"/)?.[1]
}

export async function revisarProduccion(entrada: Entrada): Promise<Lugar[]> {
  const [deVercel, secretos, auth] = await Promise.all([
    deVercelPor(entrada),
    deSupabasePor(entrada, leerSecretosDeLasFunciones),
    deSupabasePor(entrada, leerAuth),
  ])

  const de = (campo: 'production' | 'preview'): Lectura<Record<string, string>> =>
    deVercel.ok ? { ok: true, datos: nombres(deVercel.datos[campo]) } : deVercel
  return [
    lugarDe(LUGARES.produccion, de('production'), esquemaDeProduccion),
    lugarDe(LUGARES.preview, de('preview'), esquemaDePreview),
    lugarDe(
      LUGARES.funciones,
      secretos.ok ? { ok: true, datos: nombres(secretos.datos) } : secretos,
      esquemaDeLasFunciones,
    ),
    lugarDe(LUGARES.auth, auth, esquemaDeAuth),
  ]
}

export function informeDeProduccion(lugares: readonly Lugar[]): string {
  return lugares
    .map((l) => {
      if (l.estado === 'completo') return `✓ ${l.lugar}: completo`
      if (l.estado === 'no_se_pudo_leer') return `· ${l.lugar}: no se pudo leer: ${l.motivo}`
      return [`✗ ${l.lugar}:`, ...l.problemas.map((p) => `    ${p.variable}: ${p.motivo}`)].join(
        '\n',
      )
    })
    .join('\n')
}

// 0: todo completo. 1: falta algo y todo se leyó. 2: algún lugar no se pudo leer (gana sobre 1: el chequeo quedó incompleto).
export function codigoDeSalida(lugares: readonly Lugar[]): 0 | 1 | 2 {
  if (lugares.some((l) => l.estado === 'no_se_pudo_leer')) return 2
  return lugares.some((l) => l.estado === 'falta') ? 1 : 0
}
