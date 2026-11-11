// Lo que la base devuelve, leído con Zod en el borde: una fila de `tipos_documento`, el uso de cada tipo y la respuesta de las cuatro RPC.
// Una respuesta que no se entiende es `null` (el repositorio la dice como error), nunca un dato a medias.
import { z } from 'zod'
import {
  FORMATOS_DE_DOCUMENTO,
  MODOS_DE_VENCIMIENTO,
  usoDeTipoDesde,
  type RespuestaDeEliminar,
  type TipoDeDocumento,
  type UsoDeTipo,
} from './tipo-de-documento'

// Las columnas que se leen de `tipos_documento` (nunca `*`, ni `proposito`).
export const COLUMNAS_DE_TIPO_DE_DOCUMENTO =
  'id, flujo_id, nombre, descripcion, formatos, modo_vencimiento, vigencia_dias, aviso_dias, visible_portal_permitido, activo, orden, actualizado_en'

const filaCruda = z.object({
  id: z.guid(),
  flujo_id: z.guid().nullable(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  formatos: z.array(z.string()),
  modo_vencimiento: z.enum(MODOS_DE_VENCIMIENTO),
  vigencia_dias: z.number().nullable(),
  aviso_dias: z.number().nullable(),
  visible_portal_permitido: z.boolean(),
  activo: z.boolean(),
  orden: z.number(),
  actualizado_en: z.string().min(1),
})

export function tipoDeDocumentoDesde(crudo: unknown): TipoDeDocumento | null {
  const fila = filaCruda.safeParse(crudo)
  if (!fila.success) {
    return null
  }
  const f = fila.data
  return {
    id: f.id,
    flujoId: f.flujo_id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    // Lo que la base guarda y la app no conoce se descarta: ofrecer un formato que la app no sabe nombrar no ayuda.
    formatos: FORMATOS_DE_DOCUMENTO.filter((formato) => f.formatos.includes(formato)),
    modo: f.modo_vencimiento,
    vigenciaDias: f.vigencia_dias,
    avisoDias: f.aviso_dias,
    visiblePortal: f.visible_portal_permitido,
    activo: f.activo,
    orden: f.orden,
    actualizadoEn: f.actualizado_en,
  }
}

const usoCrudo = z.array(
  z.object({ tipo_id: z.guid(), documentos: z.number().int(), requisitos: z.number().int() }),
)

// `tipos_documento_con_uso()`: cada conteo llega con tope 50 + 1 y se acota.
export function usoPorTipoDesde(crudo: unknown): Record<string, UsoDeTipo> | null {
  const filas = usoCrudo.safeParse(crudo)
  if (!filas.success) {
    return null
  }
  return Object.fromEntries(
    filas.data.map((f) => [f.tipo_id, usoDeTipoDesde(f.documentos, f.requisitos)]),
  )
}

// La versión nueva de una escritura (texto ISO tal cual) y, al crear o guardar, si ya estaba hecho.
export type RespuestaDeEscritura = { id: string; actualizadoEn: string; repetido: boolean }

const escrituraCruda = z.object({
  id: z.guid(),
  actualizado_en: z.string().min(1),
  repetido: z.boolean().optional(),
  sin_cambios: z.boolean().optional(),
})

// `tipo_documento_crear` (`repetido`), `tipo_documento_guardar` (`sin_cambios`) y `tipo_documento_mover`.
export function respuestaDeEscrituraDesde(crudo: unknown): RespuestaDeEscritura | null {
  const r = escrituraCruda.safeParse(crudo)
  if (!r.success) {
    return null
  }
  return {
    id: r.data.id,
    actualizadoEn: r.data.actualizado_en,
    repetido: r.data.repetido === true || r.data.sin_cambios === true,
  }
}

const eliminarCrudo = z.object({
  accion: z.enum(['eliminado', 'desactivado']),
  documentos: z.number().int(),
  requisitos: z.number().int(),
  actualizado_en: z.string().nullable(),
})

// `tipo_documento_eliminar`: sin uso se borró (sin versión); con uso quedó desactivado y dice por qué.
export function respuestaDeEliminarDesde(crudo: unknown): RespuestaDeEliminar | null {
  const r = eliminarCrudo.safeParse(crudo)
  if (!r.success) {
    return null
  }
  return {
    accion: r.data.accion,
    uso: usoDeTipoDesde(r.data.documentos, r.data.requisitos),
  }
}
