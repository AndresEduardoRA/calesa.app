// Lo que comparten las pruebas de la edge function `apibara`.
// La edge function `apibara` corre en Deno y no entra al lint ni al typecheck: acá se carga en
// Node con un `Deno` mínimo y un `fetch` simulado que responde con lo grabado de la API real.
// Ningún pedido sale a la red, y la clave de prueba no puede aparecer en ninguna respuesta.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, vi } from 'vitest'

export const ORIGEN = '11111111-1111-4111-8111-111111111111'
export const CLAVE = 'clave-secreta-de-prueba-0123456789'
export const BASE_APIBARA = 'https://apibara.tech/api/v1/vehicle-auction'
export const FUENTE = join(process.cwd(), 'supabase/functions/apibara/index.ts')

type Manejador = (req: Request) => Promise<Response>
export let manejador: Manejador

const contexto = {
  aplica: true,
  activa: true,
  endpoint: BASE_APIBARA,
  plataformas: ['copart', 'iaai'],
  puede_crear: true,
  puede_editar: true,
  puede_ver_uso: true,
}

export function fixture(nombre: string): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), 'e2e/fixtures/apibara', nombre), 'utf8'))
}

type Ruteo = (url: string) => Response | Promise<Response> | Error | undefined
export let llamadas: { url: string; clave: string | null }[] = []

// Simula la base y apibara. `apibara` decide qué responde la API a cada dirección.
export function simular(ctx: Partial<typeof contexto> | null, apibara: Ruteo) {
  llamadas = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: string | URL, init?: RequestInit) => {
      const url = String(entrada)
      const cabeceras = new Headers(init?.headers)
      if (url.endsWith('/rpc/apibara_contexto')) {
        return Response.json(
          ctx === null ? { aplica: false, puede_ver_uso: false } : { ...contexto, ...ctx },
        )
      }
      if (url.endsWith('/rpc/integracion_secreto')) {
        return Response.json(CLAVE)
      }
      llamadas.push({ url, clave: cabeceras.get('X-API-Key') })
      const respuesta = await apibara(url)
      if (respuesta instanceof Error) {
        throw respuesta
      }
      return respuesta ?? new Response('', { status: 404 })
    }),
  )
}

export async function llamar(cuerpo: unknown): Promise<Response> {
  return manejador(
    new Request('http://funcion.test/', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-de-prueba', apikey: 'publica' },
      body: JSON.stringify(cuerpo),
    }),
  )
}

export async function codigoDe(respuesta: Response): Promise<string | null> {
  const cuerpo = (await respuesta.json()) as { ok: boolean; error?: { codigo: string } }
  return cuerpo.ok ? null : (cuerpo.error?.codigo ?? '?')
}

beforeAll(async () => {
  vi.stubGlobal('Deno', {
    env: {
      get: (nombre: string) =>
        ({
          SUPABASE_URL: 'http://base.test',
          SUPABASE_SERVICE_ROLE_KEY: 'servicio',
          SUPABASE_ANON_KEY: 'publica',
        })[nombre],
    },
    serve: (atender: Manejador) => {
      manejador = atender
    },
  })
  await import(/* @vite-ignore */ FUENTE)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('Deno', {
    env: {
      get: (nombre: string) =>
        ({
          SUPABASE_URL: 'http://base.test',
          SUPABASE_SERVICE_ROLE_KEY: 'servicio',
          SUPABASE_ANON_KEY: 'publica',
        })[nombre],
    },
    serve: () => undefined,
  })
})
