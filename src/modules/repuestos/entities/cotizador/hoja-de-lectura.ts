// Una cotización de repuestos con sus líneas, para la hoja en sólo lectura (8.12-3, C2). Puro. Los montos llegan como texto (`::text`) y se
// muestran como los guardó la base: nada se recalcula (D36). La fórmula sólo se consulta para decir qué le falta a una línea sin total.
import { z } from 'zod'
import {
  aFilaDeCotizacion,
  camposDeCotizacion,
  montoEnTexto,
  type FilaDeCotizacion,
} from './cotizacion'
import { calcularLinea, type BloqueDeCotizacion, type FaltaDeLaLinea } from './formula'
import { leerSnapshot, type LecturaDelSnapshot } from './snapshot'

export const COLUMNAS_DE_LA_COTIZACION =
  'id, numero, estado, moneda, total::text, creado_en, aceptada_en, actualizado_en, notas, config_snapshot'

export const COLUMNAS_DE_LINEA =
  'id, item_id, descripcion, bloque, cantidad, costo::text, logistica_sugerida::text, logistica::text, caja::text, total::text, orden'

export type CotizacionLeida = FilaDeCotizacion & {
  // ISO: la versión de la fila (la usan guardar, aceptar y anular en 8.12-4).
  actualizadoEn: string
  notas: string | null
  snapshot: LecturaDelSnapshot
}

// `desconocida`: sin total y sin un motivo que la fórmula pueda dar (snapshot inválido, o la fórmula daría total y la base no lo guardó).
export type FaltaEnLaHoja = FaltaDeLaLinea | 'desconocida'

export type LineaDeLectura = {
  id: string
  itemId: string | null
  descripcion: string
  bloque: BloqueDeCotizacion
  cantidad: number
  costo: string | null
  // La escrita o, si es nula, la sugerida.
  logistica: string | null
  esSugerida: boolean
  caja: string | null
  total: string | null
  orden: number
  // Nula si la base guardó el total.
  falta: FaltaEnLaHoja | null
}

export type CotizacionConLineas = { cotizacion: CotizacionLeida; lineas: LineaDeLectura[] }

const esquemaDeLaCotizacion = z.object({
  ...camposDeCotizacion,
  actualizado_en: z.string(),
  notas: z.string().nullable(),
  config_snapshot: z.unknown(),
})

const esquemaDeLinea = z.object({
  id: z.guid(),
  item_id: z.guid().nullable(),
  descripcion: z.string(),
  bloque: z.enum(['importado', 'local']),
  cantidad: z.number().int(),
  costo: montoEnTexto.nullable(),
  logistica_sugerida: montoEnTexto.nullable(),
  logistica: montoEnTexto.nullable(),
  caja: montoEnTexto.nullable(),
  total: montoEnTexto.nullable(),
  orden: z.number().int(),
})

/** La fila de la cotización con su snapshot leído; nulo si no tiene la forma esperada. */
export function cotizacionDesde(dato: unknown): CotizacionLeida | null {
  const leido = esquemaDeLaCotizacion.safeParse(dato)
  if (!leido.success) return null
  const f = leido.data
  return {
    ...aFilaDeCotizacion(f),
    actualizadoEn: f.actualizado_en,
    notas: f.notas,
    snapshot: leerSnapshot(f.config_snapshot),
  }
}

function faltaDe(l: z.infer<typeof esquemaDeLinea>, snapshot: LecturaDelSnapshot) {
  if (l.total !== null) return null
  if (!snapshot.ok) return 'desconocida'
  const { falta } = calcularLinea(snapshot.snapshot, {
    bloque: l.bloque,
    cantidad: l.cantidad,
    costo: l.costo,
    logistica: l.logistica,
    caja: l.caja,
  })
  return falta ?? 'desconocida'
}

/** Las líneas de la cotización, con lo que le falta a cada una sin total; nulo si alguna no tiene la forma esperada. */
export function lineasDesde(datos: unknown, snapshot: LecturaDelSnapshot): LineaDeLectura[] | null {
  const leido = z.array(esquemaDeLinea).safeParse(datos)
  if (!leido.success) return null
  return leido.data.map((l) => ({
    id: l.id,
    itemId: l.item_id,
    descripcion: l.descripcion,
    bloque: l.bloque,
    cantidad: l.cantidad,
    costo: l.costo,
    logistica: l.logistica ?? l.logistica_sugerida,
    esSugerida: l.logistica === null && l.logistica_sugerida !== null,
    caja: l.caja,
    total: l.total,
    orden: l.orden,
    falta: faltaDe(l, snapshot),
  }))
}

/** Los dos bloques de la hoja, cada uno en el orden de `orden`. */
export function lineasPorBloque(lineas: readonly LineaDeLectura[]): {
  importado: LineaDeLectura[]
  local: LineaDeLectura[]
} {
  const ordenadas = [...lineas].sort((a, b) => a.orden - b.orden)
  return {
    importado: ordenadas.filter((l) => l.bloque === 'importado'),
    local: ordenadas.filter((l) => l.bloque === 'local'),
  }
}
