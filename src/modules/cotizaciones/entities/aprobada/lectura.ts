// Lo que llega de la base sobre la aprobada, validado: la respuesta de `cotizacion_aprobar`, las filas de `cotizaciones_aprobadas` y la marca de la guardada. Un dato
// que no cumple es `null`: nunca una marca inventada.
import { z } from 'zod'
import type {
  CotizacionAprobadaDelVehiculo,
  CotizacionAprobable,
  MarcaDeLaGuardada,
  ResultadoDeAprobar,
} from './tipos'

// La FK que une la marca con su cotización (se nombra en el embebido).
export const COLUMNAS_DE_LA_MARCA =
  'estado, cotizaciones_aprobadas!cotizaciones_aprobadas_cotizacion_id_fkey(cotizacion_id)'

const esquemaDeLaCotizacion = z.object({
  id: z.guid(),
  numero: z.number().int(),
  actualizado_en: z.string().min(1),
})

const esquemaDeAprobar = z.object({
  cotizacion: esquemaDeLaCotizacion,
  anterior: esquemaDeLaCotizacion.nullable(),
})

const deLaBase = (c: z.infer<typeof esquemaDeLaCotizacion>): CotizacionAprobable => ({
  id: c.id,
  numero: c.numero,
  actualizadoEn: c.actualizado_en,
})

export function resultadoDeAprobar(respuesta: unknown): ResultadoDeAprobar | null {
  const leida = esquemaDeAprobar.safeParse(respuesta)
  return leida.success
    ? {
        cotizacion: deLaBase(leida.data.cotizacion),
        anterior: leida.data.anterior === null ? null : deLaBase(leida.data.anterior),
      }
    : null
}

const esquemaDeLasAprobadas = z.array(
  z.object({
    vehiculo_id: z.guid(),
    cotizacion_id: z.guid(),
    // `monto::text`: el numeric tal cual, sin pasar por un número.
    monto: z.string().nullable(),
    moneda: z.string().regex(/^[A-Z]{3}$/),
  }),
)

export function aprobadasDelVehiculoDesde(filas: unknown): CotizacionAprobadaDelVehiculo[] | null {
  const leidas = esquemaDeLasAprobadas.safeParse(filas)
  return leidas.success
    ? leidas.data.map((f) => ({
        vehiculoId: f.vehiculo_id,
        cotizacionId: f.cotizacion_id,
        monto: f.monto,
        moneda: f.moneda,
      }))
    : null
}

const esquemaDeLasIds = z.array(z.object({ cotizacion_id: z.guid() }))

export function idsAprobadosDesde(filas: unknown): ReadonlySet<string> | null {
  const leidas = esquemaDeLasIds.safeParse(filas)
  return leidas.success ? new Set(leidas.data.map((f) => f.cotizacion_id)) : null
}

const esquemaDeLaMarca = z.array(
  z.object({
    estado: z.enum(['activa', 'reportada', 'invalida']),
    // Una a una (la FK `cotizacion_id` es única): un objeto o nada.
    cotizaciones_aprobadas: z.object({ cotizacion_id: z.guid() }).nullable(),
  }),
)

export function marcaDeLaGuardadaDesde(filas: unknown): MarcaDeLaGuardada | null {
  const leida = esquemaDeLaMarca.safeParse(filas)
  const fila = leida.success ? leida.data[0] : undefined
  return fila === undefined
    ? null
    : { aprobada: fila.cotizaciones_aprobadas !== null, estado: fila.estado }
}
