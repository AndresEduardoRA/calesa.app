// La configuración congelada de una cotización de repuestos (`repuestos_cotizaciones.config_snapshot`, 8.12-1, C4). Puro.
// La base la arma al crear la cotización con la configuración vigente (la de id más alto), los tramos activos y las cajas activas de su moneda.
// Los números van como texto: un `float` de JSON perdería cifras.
import { z } from 'zod'

// La escala de la columna: un factor con más de 4 decimales o un monto con más de 2 no es un snapshot de la base (la fórmula los perdería).
const factor = z.string().regex(/^\d+(\.\d{1,4})?$/)
const decimal = z.string().regex(/^\d+(\.\d{1,2})?$/)

export const esquemaDelSnapshot = z.object({
  version: z.literal(1),
  moneda: z.string().min(1),
  config: z.object({
    id: z.number().int(),
    factor_importado: factor,
    recargo_local: factor,
    redondeo: decimal,
    vigente_desde: z.string(),
  }),
  // Por `costo_min`; un `costo_max` nulo es un tramo abierto hacia arriba.
  tramos: z.array(z.object({ costo_min: decimal, costo_max: decimal.nullable(), monto: decimal })),
  // Por `monto`.
  cajas: z.array(z.object({ id: z.guid(), monto: decimal })),
})

export type SnapshotDelCotizador = z.infer<typeof esquemaDelSnapshot>
export type TramoDeLogistica = SnapshotDelCotizador['tramos'][number]

export type LecturaDelSnapshot = { ok: true; snapshot: SnapshotDelCotizador } | { ok: false }

/** El snapshot que guardó la base, o `{ ok: false }` si no tiene la forma de la versión 1. */
export function leerSnapshot(dato: unknown): LecturaDelSnapshot {
  const leido = esquemaDelSnapshot.safeParse(dato)
  return leido.success ? { ok: true, snapshot: leido.data } : { ok: false }
}
