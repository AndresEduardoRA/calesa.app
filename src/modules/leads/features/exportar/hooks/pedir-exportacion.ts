import { z } from 'zod'
import { descargarArchivo } from '@/shared/lib/csv/descargar'
import type { Delimitador } from '@/shared/lib/csv/escribir'

// Lo que le pasó al pedido de una exportación, dicho para la pantalla.
export type EstadoDeExportacion =
  | { tipo: 'reposo' }
  | { tipo: 'descargando' }
  | { tipo: 'listo'; filas: number; nombre: string }
  | { tipo: 'vacia' }
  | { tipo: 'demasiadas'; total: number }
  | { tipo: 'limite'; libreEn: string }
  | { tipo: 'sin_permiso' }
  | { tipo: 'sin_red' }
  | { tipo: 'error'; mensaje: string }

export const RUTA_DE_EXPORTACION = '/leads/exportar'
export const ERROR_DE_EXPORTACION = 'No pudimos preparar la exportación. Vuelve a intentarlo.'
export const SESION_VENCIDA_AL_EXPORTAR =
  'Tu sesión venció. Ingresa de nuevo en otra pestaña y vuelve a intentarlo.'

// Lo que dice el servidor cuando no entrega el archivo (`route.ts`).
const esquemaDeRechazo = z.object({
  codigo: z.string().optional(),
  total: z.number().optional(),
  libreEn: z.string().optional(),
  mensaje: z.string().optional(),
})

type Rechazo = z.infer<typeof esquemaDeRechazo>

const POR_CODIGO: Record<string, (rechazo: Rechazo) => EstadoDeExportacion | null> = {
  demasiadas: ({ total }) => (total === undefined ? null : { tipo: 'demasiadas', total }),
  limite: ({ libreEn }) => (libreEn === undefined ? null : { tipo: 'limite', libreEn }),
  vacia: () => ({ tipo: 'vacia' }),
  sin_permiso: () => ({ tipo: 'sin_permiso' }),
}

export function estadoDeRechazo(cuerpo: unknown): EstadoDeExportacion {
  const leido = esquemaDeRechazo.safeParse(cuerpo)
  const rechazo: Rechazo = leido.success ? leido.data : {}
  const conocido = rechazo.codigo === undefined ? null : POR_CODIGO[rechazo.codigo]?.(rechazo)
  return conocido ?? { tipo: 'error', mensaje: rechazo.mensaje ?? ERROR_DE_EXPORTACION }
}

export function nombreDelArchivo(disposicion: string | null): string {
  const encontrado = /filename="([^"]+)"/.exec(disposicion ?? '')
  return encontrado?.[1] ?? 'leads.csv'
}

async function jsonODefecto(respuesta: Response): Promise<unknown> {
  try {
    return await respuesta.json()
  } catch {
    return null
  }
}

// Qué hacer con la respuesta ya recibida: descargar el CSV o decir por qué no hay.
async function estadoDeLaRespuesta(respuesta: Response): Promise<EstadoDeExportacion> {
  const tipo = respuesta.headers.get('content-type') ?? ''
  // Sin sesión el proxy responde con la pantalla de ingreso: no es un CSV ni un JSON nuestro.
  if (respuesta.redirected || (!respuesta.ok && !tipo.includes('application/json'))) {
    return { tipo: 'error', mensaje: SESION_VENCIDA_AL_EXPORTAR }
  }
  if (!respuesta.ok) {
    return estadoDeRechazo(await jsonODefecto(respuesta))
  }
  if (!tipo.includes('text/csv')) {
    return { tipo: 'error', mensaje: ERROR_DE_EXPORTACION }
  }
  try {
    const blob = await respuesta.blob()
    const nombre = nombreDelArchivo(respuesta.headers.get('content-disposition'))
    descargarArchivo(blob, nombre)
    return { tipo: 'listo', filas: Number(respuesta.headers.get('x-total-de-filas') ?? 0), nombre }
  } catch {
    // El flujo se cortó a la mitad: no hay archivo.
    return { tipo: 'error', mensaje: ERROR_DE_EXPORTACION }
  }
}

// El POST con los filtros del listado. Espera el archivo entero antes de entregarlo.
export async function pedirExportacion(
  consulta: string,
  delimitador: Delimitador,
): Promise<EstadoDeExportacion> {
  let respuesta: Response
  try {
    respuesta = await fetch(RUTA_DE_EXPORTACION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consulta, delimitador }),
      cache: 'no-store',
    })
  } catch {
    return { tipo: 'sin_red' }
  }
  return estadoDeLaRespuesta(respuesta)
}
