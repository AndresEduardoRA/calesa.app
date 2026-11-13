// Lo que el hueco «Pagos» lee desde el navegador, con la sesión de quien mira (6.11-2): los pagos de una unidad bajo la policy `pagos: leer` y, en una sola consulta, el nombre de quien
// confirmó cada uno (el sello). Escribir va por Server Action (`infra/dinero/pagos.ts`).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { cortarAlTope } from '@/shared/lib/conteo'
import { createClient } from '@/shared/lib/supabase/browser'
import { pagosDesde, type Pago } from '../../entities/dinero/pago'

export const NO_SE_CARGARON_LOS_PAGOS = 'No se pudieron cargar los pagos.'

// Cuántos pagos de una unidad se dibujan: una unidad lleva decenas, no miles (anticipos y saldos). Más recientes primero; el resto está en `/logistica/gastos`.
export const TOPE_DE_PAGOS_DE_LA_UNIDAD = 50

const COLUMNAS =
  'id, vehiculo_id, lead_id, concepto, moneda, monto, tipo_cambio_id, tipo_cambio_aplicado, monto_base, metodo, fecha, confirmado, confirmado_por, confirmado_en, comprobante_ruta, notas, actualizado_en'

export type PagosDeLaUnidad = { pagos: Pago[]; hayMas: boolean }

// Los nombres de quien confirmó: una consulta por todos, nunca una por fila. Si falla, el sello dice «otra persona» y la lista se muestra igual.
async function nombresDe(ids: readonly string[]): Promise<Record<string, string>> {
  if (ids.length === 0) {
    return {}
  }
  const { data, error } = await createClient()
    .from('perfiles')
    .select('id, nombre')
    .in('id', [...ids])
    .limit(ids.length)
  if (error) {
    return {}
  }
  const nombres: Record<string, string> = {}
  for (const fila of data) {
    if (typeof fila.nombre === 'string' && fila.nombre.trim() !== '') {
      nombres[fila.id] = fila.nombre
    }
  }
  return nombres
}

// Por el índice de la columna (`pagos_vehiculo_idx` o `pagos_proyecto_repuestos_id_idx`) donde no está eliminado, con `limit tope + 1`: ordena a lo sumo esas filas. Los
// eliminados no salen: la policy de lectura los esconde.
async function leerPagos(
  columna: 'vehiculo_id' | 'proyecto_repuestos_id',
  id: string,
): Promise<Resultado<PagosDeLaUnidad>> {
  const { data, error } = await createClient()
    .from('pagos')
    .select(COLUMNAS)
    .eq(columna, id)
    .is('eliminado_en', null)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_PAGOS_DE_LA_UNIDAD + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = (Array.isArray(data) ? data : []) as { confirmado_por?: string | null }[]
  const ids = [
    ...new Set(
      filas.flatMap((f) => (typeof f.confirmado_por === 'string' ? [f.confirmado_por] : [])),
    ),
  ]
  const pagos = pagosDesde(data, await nombresDe(ids))
  if (!pagos) {
    return fallo('inesperado', NO_SE_CARGARON_LOS_PAGOS)
  }
  const { filas: visibles, hayMas } = cortarAlTope(pagos, TOPE_DE_PAGOS_DE_LA_UNIDAD)
  return ok({ pagos: visibles, hayMas })
}

export function leerPagosDeLaUnidad(vehiculoId: string): Promise<Resultado<PagosDeLaUnidad>> {
  return leerPagos('vehiculo_id', vehiculoId)
}

// Los pagos del cliente de un proyecto de repuestos (8.13-5): la misma lectura, con `repuestos.costos.ver` (la policy).
export function leerPagosDelProyecto(proyectoId: string): Promise<Resultado<PagosDeLaUnidad>> {
  return leerPagos('proyecto_repuestos_id', proyectoId)
}
