import { z } from 'zod'

// Un documento de una unidad (6.06-1): la fila de `documentos` tal como la lee el hueco «Documentos». Pura: sin I/O. La lectura trae sólo los vivos; `eliminadoEn` va en el tipo
// para que la regla de «cuenta para un requisito» sea la de la base letra por letra.

export const ESTADOS_DE_DOCUMENTO = ['pendiente', 'subido', 'aprobado', 'rechazado'] as const
export type EstadoDeDocumento = (typeof ESTADOS_DE_DOCUMENTO)[number]

const esquemaDeDocumento = z.object({
  id: z.guid(),
  tipo_documento_id: z.guid(),
  estado: z.enum(ESTADOS_DE_DOCUMENTO),
  ruta: z.string().nullable(),
  nombre_archivo: z.string().nullable(),
  mime: z.string().nullable(),
  bytes: z.number().nullable(),
  emitido_el: z.string().nullable(),
  vence_el: z.string().nullable(),
  nota: z.string().nullable(),
  motivo_rechazo: z.string().nullable(),
  subido_por: z.guid().nullable(),
  revisado_por: z.guid().nullable(),
  revisado_en: z.string().nullable(),
  visible_portal: z.boolean(),
  eliminado_en: z.string().nullable(),
  creado_en: z.string(),
  actualizado_en: z.string(),
})

export type DocumentoDeLaUnidad = {
  id: string
  tipoId: string
  estado: EstadoDeDocumento
  ruta: string | null
  nombre: string | null
  mime: string | null
  bytes: number | null
  // Fechas del calendario (`YYYY-MM-DD`): nunca pasan por `new Date`.
  emitidoEl: string | null
  venceEl: string | null
  nota: string | null
  motivoDeRechazo: string | null
  subidoPor: string | null
  revisadoPor: string | null
  revisadoEn: string | null
  visiblePortal: boolean
  eliminadoEn: string | null
  creadoEn: string
  // La versión de la fila: la piden aprobar, rechazar, editar y eliminar (6.06-3).
  actualizadoEn: string
}

/** Las filas de `documentos` como documentos; nulo si alguna no tiene la forma esperada (nunca una lista a medias). */
export function documentosDesde(datos: unknown): DocumentoDeLaUnidad[] | null {
  const leido = z.array(esquemaDeDocumento).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((d) => ({
    id: d.id,
    tipoId: d.tipo_documento_id,
    estado: d.estado,
    ruta: d.ruta,
    nombre: d.nombre_archivo,
    mime: d.mime,
    bytes: d.bytes,
    emitidoEl: d.emitido_el,
    venceEl: d.vence_el,
    nota: d.nota,
    motivoDeRechazo: d.motivo_rechazo,
    subidoPor: d.subido_por,
    revisadoPor: d.revisado_por,
    revisadoEn: d.revisado_en,
    visiblePortal: d.visible_portal,
    eliminadoEn: d.eliminado_en,
    creadoEn: d.creado_en,
    actualizadoEn: d.actualizado_en,
  }))
}

const esquemaDeTipo = z.object({
  id: z.guid(),
  nombre: z.string(),
  formatos: z.array(z.string()),
  modo_vencimiento: z.enum(['ninguno', 'renovar', 'solicitar']),
  vigencia_dias: z.number().nullable(),
  visible_portal_permitido: z.boolean(),
  flujo_id: z.guid().nullable(),
  orden: z.number(),
})

export type TipoDeDocumento = {
  id: string
  nombre: string
  formatos: readonly string[]
  modoDeVencimiento: 'ninguno' | 'renovar' | 'solicitar'
  vigenciaDias: number | null
  visiblePortalPermitido: boolean
  flujoId: string | null
  orden: number
}

/** Las filas de `tipos_documento` como tipos; nulo si alguna no tiene la forma esperada. */
export function tiposDesde(datos: unknown): TipoDeDocumento[] | null {
  const leido = z.array(esquemaDeTipo).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    formatos: t.formatos,
    modoDeVencimiento: t.modo_vencimiento,
    vigenciaDias: t.vigencia_dias,
    visiblePortalPermitido: t.visible_portal_permitido,
    flujoId: t.flujo_id,
    orden: t.orden,
  }))
}
