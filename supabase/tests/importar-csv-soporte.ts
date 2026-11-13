// Lo que comparten las pruebas de contrato de la función `importar-csv` (supabase/functions/importar-csv).
// El código de la función corre en Deno y no entra al lint ni al typecheck (tsconfig y ESLint excluyen `supabase/functions`): se
// carga en Node por una ruta en variable, y los tipos de abajo son su contrato. Ningún pedido sale a la red: la base es un simulado
// que imita lo que contestan `importacion_empezar`, `importacion_procesar_lote` e `importacion_terminar`.
import { join } from 'node:path'
import { vi } from 'vitest'
import { escribirArchivo, type FilaNormalizada } from '@/modules/datos/entities/plantillas'

const CARPETA = join(process.cwd(), 'supabase/functions/importar-csv')

export type Importacion = {
  id: string
  entidad: string
  archivo_ruta: string | null
  estado: string
}
export type Resultado = {
  importacion: string
  estado: string
  procesadas: number | null
  filas_total: number | null
}
export type Dependencias = {
  rpc: <T>(nombre: string, argumentos: Record<string, unknown>) => Promise<T>
  leerImportacion: (id: string) => Promise<Importacion | null>
  bajar: (ruta: string) => Promise<Uint8Array | null>
  borrar: (ruta: string) => Promise<boolean>
  ahora: () => number
}
export type ModuloProcesar = {
  PRESUPUESTO_MS: number
  procesarImportacion: (id: string, dep: Dependencias, inicio: number) => Promise<Resultado>
}

export async function cargar<T>(archivo: 'procesar.ts' | 'index.ts'): Promise<T> {
  const ruta = join(CARPETA, archivo)
  return (await import(/* @vite-ignore */ ruta)) as T
}

export const ID = '33333333-3333-4333-8333-333333333333'
export const RUTA = '44444444-4444-4444-8444-444444444444/archivo-de-ana.csv'
export const IMPORTACION: Importacion = {
  id: ID,
  entidad: 'leads',
  archivo_ruta: RUTA,
  estado: 'pendiente',
}

export const bytesDe = (texto: string) => new TextEncoder().encode(texto)

// `n` filas de leads normalizadas; el teléfono y el nombre llevan el número de fila.
export function archivoDeLeads(
  n: number,
  cambios: Record<number, FilaNormalizada> = {},
): Uint8Array<ArrayBuffer> {
  const filas: FilaNormalizada[] = Array.from(
    { length: n },
    (_, i) =>
      cambios[i + 1] ?? {
        datos: {
          nombre: `Persona ${String(i + 1)}`,
          telefono_principal: `7${String(1000000 + i)}`,
        },
      },
  )
  return bytesDe(escribirArchivo('leads', filas))
}

export type Llamada = { nombre: string; args: Record<string, unknown> }
type Lote = { p_importacion: string; p_desde: number; p_filas: unknown[] }

// La base simulada: la marca `procesadas` avanza como la de verdad (lo ya procesado se salta) y cada RPC queda anotada.
export class BaseFalsa {
  llamadas: Llamada[] = []
  borrados: string[] = []
  procesadas = 0
  filasTotal: number | null = null
  reloj = 0
  // Lo que cambia una prueba: la respuesta de empezar o de un lote, y el archivo.
  empezar: (total: number) => unknown = (total) => {
    if (this.filasTotal !== null) {
      return {
        estado: 'procesando',
        filas_total: this.filasTotal,
        procesadas: this.procesadas,
        repetido: true,
      }
    }
    this.filasTotal = total
    return { estado: 'procesando', filas_total: total, procesadas: 0, repetido: false }
  }
  alLote: (lote: Lote, base: BaseFalsa) => unknown = (lote) => this.lote(lote)

  constructor(
    public importacion: Importacion | null = IMPORTACION,
    public archivo: Uint8Array<ArrayBuffer> | null = archivoDeLeads(3),
  ) {}

  lote({ p_desde, p_filas }: Lote): unknown {
    const ultima = p_desde + p_filas.length - 1
    if (ultima <= this.procesadas) {
      return { procesadas: this.procesadas, creadas: 0, saltadas: p_filas.length }
    }
    const saltadas = p_filas.length - (ultima - this.procesadas)
    this.procesadas = ultima
    return { procesadas: ultima, creadas: p_filas.length - saltadas, saltadas }
  }

  rpc = <T>(nombre: string, args: Record<string, unknown>): Promise<T> => {
    this.llamadas.push({ nombre, args })
    const respuestas: Record<string, () => unknown> = {
      importacion_abrir: () => ID,
      importacion_empezar: () => this.empezar(Number(args['p_total'])),
      importacion_procesar_lote: () => this.alLote(args as unknown as Lote, this),
      importacion_terminar: () => ({ estado: args['p_error'] ? 'fallida' : 'terminada' }),
    }
    const responder = respuestas[nombre]
    return responder
      ? Promise.resolve(responder() as T)
      : Promise.reject(new Error(`${nombre} respondió 404`))
  }

  dependencias(): Dependencias {
    return {
      rpc: this.rpc,
      leerImportacion: () => Promise.resolve(this.importacion),
      bajar: () => Promise.resolve(this.archivo),
      borrar: (ruta) => {
        this.borrados.push(ruta)
        return Promise.resolve(true)
      },
      ahora: () => this.reloj,
    }
  }

  nombres(): string[] {
    return this.llamadas.map((l) => l.nombre)
  }

  lotes(): Lote[] {
    return this.llamadas
      .filter((l) => l.nombre === 'importacion_procesar_lote')
      .map((l) => l.args as unknown as Lote)
  }
}

// La función entera: un `Deno` mínimo y un `fetch` simulado que hace de PostgREST y de Storage sobre una `BaseFalsa`.
type Manejador = (pedido: Request) => Promise<Response>
export const BASE_DE_PRUEBA = 'http://base.test'
export const SERVICIO = 'clave-de-servicio-de-prueba'
let manejador: Manejador | undefined

export async function cargarFuncion(): Promise<void> {
  vi.stubGlobal('Deno', {
    env: {
      get: (nombre: string) =>
        ({ SUPABASE_URL: BASE_DE_PRUEBA, SUPABASE_SERVICE_ROLE_KEY: SERVICIO })[nombre],
    },
    serve: (atender: Manejador) => {
      manejador = atender
    },
  })
  await cargar('index.ts')
}

export type Pedido = { metodo: string; url: string; cuerpo: unknown; autorizacion: string | null }

function responderStorage(base: BaseFalsa, metodo: string, url: string, cuerpo: unknown): Response {
  if (metodo === 'DELETE' && url === `${BASE_DE_PRUEBA}/storage/v1/object/importaciones`) {
    base.borrados.push(...(cuerpo as { prefixes: string[] }).prefixes)
    return Response.json([])
  }
  if (url.startsWith(`${BASE_DE_PRUEBA}/storage/v1/object/importaciones/`)) {
    return base.archivo ? new Response(base.archivo) : new Response('{}', { status: 400 })
  }
  return new Response(null, { status: 500 })
}

async function responderRest(
  base: BaseFalsa,
  abierto: string | null,
  url: string,
  cuerpo: unknown,
): Promise<Response | null> {
  const rpc = /\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url)?.[1]
  if (rpc === 'importacion_abrir') {
    base.llamadas.push({ nombre: rpc, args: cuerpo as Record<string, unknown> })
    return Response.json(abierto)
  }
  if (rpc) {
    return Response.json(await base.rpc(rpc, cuerpo as Record<string, unknown>))
  }
  if (url.startsWith(`${BASE_DE_PRUEBA}/rest/v1/importaciones?`)) {
    return Response.json(base.importacion ? [base.importacion] : [])
  }
  return null
}

// `abierto` es lo que devuelve `importacion_abrir` (null = el pase no vale).
export function simularBase(base: BaseFalsa, abierto: string | null = ID): Pedido[] {
  const pedidos: Pedido[] = []
  vi.stubGlobal('fetch', async (entrada: string | URL, init?: RequestInit) => {
    const url = String(entrada)
    const metodo = init?.method ?? 'GET'
    const cuerpo: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    pedidos.push({
      metodo,
      url,
      cuerpo,
      autorizacion: new Headers(init?.headers).get('Authorization'),
    })
    return (
      (await responderRest(base, abierto, url, cuerpo)) ??
      responderStorage(base, metodo, url, cuerpo)
    )
  })
  return pedidos
}

export async function llamarFuncion(
  cuerpo: unknown,
  metodo = 'POST',
): Promise<{ estado: number; json: unknown; texto: string }> {
  if (!manejador) {
    throw new Error('la función no se cargó')
  }
  const respuesta = await manejador(
    new Request('http://funcion.test/', {
      method: metodo,
      ...(metodo === 'POST' ? { body: JSON.stringify(cuerpo) } : {}),
    }),
  )
  const texto = await respuesta.text()
  return { estado: respuesta.status, json: JSON.parse(texto), texto }
}
