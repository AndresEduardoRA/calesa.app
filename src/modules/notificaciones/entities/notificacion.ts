// Una notificación tal como la ven la campana y `/notificaciones`: la fila de la base ya validada. Sin I/O.
import { z } from 'zod'

// Lo que se pide por pantalla en la campana: las que piden acción primero y, si faltan, las más recientes.
export const TAMANO_DE_LA_CAMPANA = 10
// El contador de la campana nunca es el total: se lee hasta aquí y de ahí sale «9+».
export const TOPE_DEL_CONTADOR = 9
// «Marcar todas como leídas» va por lotes (cada uno una sentencia) y hasta `LOTES_POR_CLIC` por clic.
export const LOTE_DE_MARCADO = 200
export const LOTES_POR_CLIC = 5

export const COLUMNAS_DE_NOTIFICACION =
  'id, tipo, titulo, cuerpo, referencia_tipo, referencia_id, ruta, requiere_accion, leida_en, accionada_en, creado_en'

const esquemaDeFila = z.object({
  id: z.number().int().positive(),
  tipo: z.string(),
  titulo: z.string(),
  cuerpo: z.string().nullable(),
  referencia_tipo: z.string().nullable(),
  referencia_id: z.guid().nullable(),
  ruta: z.string().nullable(),
  requiere_accion: z.boolean(),
  leida_en: z.string().nullable(),
  accionada_en: z.string().nullable(),
  creado_en: z.string(),
})

export type Notificacion = {
  id: number
  tipo: string
  titulo: string
  cuerpo: string | null
  referenciaTipo: string | null
  referenciaId: string | null
  ruta: string | null
  requiereAccion: boolean
  // Fechas ISO.
  leidaEn: string | null
  accionadaEn: string | null
  creadoEn: string
  leida: boolean
  accionada: boolean
}

// Una fila inválida se descarta (null): no tumba la lista.
export function notificacionDesde(fila: unknown): Notificacion | null {
  const lectura = esquemaDeFila.safeParse(fila)
  if (!lectura.success) {
    return null
  }
  const f = lectura.data
  return {
    id: f.id,
    tipo: f.tipo,
    titulo: f.titulo,
    cuerpo: f.cuerpo,
    referenciaTipo: f.referencia_tipo,
    referenciaId: f.referencia_id,
    ruta: f.ruta,
    requiereAccion: f.requiere_accion,
    leidaEn: f.leida_en,
    accionadaEn: f.accionada_en,
    creadoEn: f.creado_en,
    leida: f.leida_en !== null,
    accionada: f.accionada_en !== null,
  }
}

export function notificacionesDesde(filas: unknown): Notificacion[] {
  if (!Array.isArray(filas)) {
    return []
  }
  return filas.flatMap((fila) => {
    const n = notificacionDesde(fila)
    return n ? [n] : []
  })
}

// La página siguiente es «lo que viene después de la última fila que viste»: `(creado_en, id)` descendente.
export type CursorDeNotificaciones = { creadoEn: string; id: number }

export function cursorDe(n: Pick<Notificacion, 'creadoEn' | 'id'>): CursorDeNotificaciones {
  return { creadoEn: n.creadoEn, id: n.id }
}

export type FiltroDeLista = 'por-accionar' | 'todas'
export const FILTROS_DE_LISTA: readonly FiltroDeLista[] = ['por-accionar', 'todas']

// `?ver=`: un valor ilegible es el de siempre, `todas`.
export function filtroDeLista(valor: string | null | undefined): FiltroDeLista {
  return valor === 'por-accionar' ? 'por-accionar' : 'todas'
}

export type PaginaDeNotificaciones = {
  filas: Notificacion[]
  // Había más allá de lo leído.
  hayMas: boolean
}

export type PedidoDePagina = {
  ver: FiltroDeLista
  desde?: CursorDeNotificaciones
  tamano: number
}

// Aviso de que «Marcar todas como leídas» marcó un tramo y quedan más (el último lote vino lleno).
export type ResultadoDeMarcado = { marcadas: number; quedanMas: boolean }

// El id llega de un formulario o de la URL: un entero positivo seguro, como número o como texto numérico.
export const esquemaDeIdDeNotificacion = z.union([
  z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  z
    .string()
    .regex(/^[1-9]\d{0,15}$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
])
