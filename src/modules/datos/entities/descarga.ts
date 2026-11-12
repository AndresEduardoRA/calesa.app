// Lo que contesta `POST /datos/exportar`, dicho como el estado de una tarjeta de «Exportar». Sin I/O: el pedido lo hace `use-descarga.ts`.
import { z } from 'zod'
import type { Entidad } from './exportacion'

// Espejo del cupo de `datos_exportacion_registrar` (3 por hora y por entidad): sólo para decirlo. Lo cumple la base.
export const EXPORTACIONES_POR_HORA = 3

export type MotivoDeError = 'generico' | 'sin_red' | 'sesion'

export type EstadoDeDescarga =
  | { tipo: 'reposo' }
  | { tipo: 'preparando' }
  | { tipo: 'listo'; nombre: string }
  | { tipo: 'vacia' }
  | { tipo: 'demasiadas'; tope: number }
  | { tipo: 'limite'; libreEn: string }
  | { tipo: 'sin_permiso' }
  | { tipo: 'error'; motivo: MotivoDeError; mensaje?: string }

export type LecturaDeLaRespuesta = EstadoDeDescarga | { tipo: 'archivo' }

export const TEXTOS_DE_ERROR: Record<MotivoDeError, string> = {
  generico: 'No pudimos preparar el archivo. Vuelve a intentarlo.',
  sin_red: 'Sin conexión. Revisa tu red y vuelve a intentarlo.',
  sesion: 'Tu sesión venció. Ingresa de nuevo en otra pestaña y vuelve a intentarlo.',
}

const esquemaDelRechazo = z.object({
  codigo: z.string().optional(),
  tope: z.number().int().positive().optional(),
  libreEn: z.string().optional(),
  mensaje: z.string().optional(),
})

type Respuesta = { status: number; tipo: string; redirigida: boolean; cuerpo: unknown }

const GENERICO = { tipo: 'error', motivo: 'generico' } as const

function rechazo(status: number, cuerpo: unknown): LecturaDeLaRespuesta {
  const leido = esquemaDelRechazo.safeParse(cuerpo)
  if (!leido.success) {
    return GENERICO
  }
  const { codigo, tope, libreEn, mensaje } = leido.data
  if (codigo === 'vacia') {
    return { tipo: 'vacia' }
  }
  if (codigo === 'demasiadas') {
    return tope === undefined ? GENERICO : { tipo: 'demasiadas', tope }
  }
  if (codigo === 'limite') {
    return libreEn === undefined ? GENERICO : { tipo: 'limite', libreEn }
  }
  if (codigo === 'sin_permiso') {
    return { tipo: 'sin_permiso' }
  }
  if (codigo === 'sesion') {
    return { tipo: 'error', motivo: 'sesion' }
  }
  // Sólo el 500 trae un texto nuestro que vale mostrar.
  return status >= 500 && mensaje !== undefined ? { ...GENERICO, mensaje } : GENERICO
}

export function estadoDeLaRespuesta({
  status,
  tipo,
  redirigida,
  cuerpo,
}: Respuesta): LecturaDeLaRespuesta {
  const ok = status >= 200 && status < 300
  // Sin sesión el proxy contesta con la pantalla de ingreso: no es un CSV ni un JSON nuestro.
  if (redirigida || (!ok && !tipo.includes('application/json'))) {
    return { tipo: 'error', motivo: 'sesion' }
  }
  if (!ok) {
    return rechazo(status, cuerpo)
  }
  return tipo.includes('text/csv') ? { tipo: 'archivo' } : GENERICO
}

export function nombreDeLaDisposicion(disposicion: string | null, entidad: Entidad): string {
  return /filename="([^"]+)"/.exec(disposicion ?? '')?.[1] ?? `${entidad}.csv`
}
