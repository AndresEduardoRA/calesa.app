// Lo que los huecos «Gastos» y «Margen» leen desde el navegador, con la sesión de quien mira (6.11-1): los gastos de una unidad bajo la policy `gastos: leer` y el margen por
// `margen_vehiculo`. Escribir va por Server Action (`infra/dinero/gastos.ts`).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { cortarAlTope } from '@/shared/lib/conteo'
import { gastosDesde, type Gasto } from '../../entities/dinero/gasto'
import { margenDesde, type Margen } from '../../entities/dinero/margen'

export const NO_SE_CARGARON_LOS_GASTOS = 'No se pudieron cargar los gastos.'
export const NO_SE_CARGO_EL_MARGEN = 'No se pudo cargar el margen.'

// Cuántos gastos de una unidad se dibujan: una unidad lleva decenas, no miles (cada flete, cada tributo, cada grúa). Más recientes primero; el resto está en `/logistica/gastos`.
export const TOPE_DE_GASTOS_DE_LA_UNIDAD = 50

const COLUMNAS =
  'id, vehiculo_id, categoria_id, categoria:categorias_gasto(nombre), moneda, monto, tipo_cambio_id, tipo_cambio_aplicado, monto_base, fecha, proveedor, comprobante_ruta, lote_id, notas, actualizado_en'

export type GastosDeLaUnidad = { gastos: Gasto[]; hayMas: boolean }

// Por `gastos_vehiculo_idx` (vehiculo_id), con `limit tope + 1`: ordena a lo sumo esas filas. Los eliminados no salen: la policy de lectura los esconde.
export async function leerGastosDeLaUnidad(
  vehiculoId: string,
): Promise<Resultado<GastosDeLaUnidad>> {
  const { data, error } = await createClient()
    .from('gastos')
    .select(COLUMNAS)
    .eq('vehiculo_id', vehiculoId)
    .is('eliminado_en', null)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_GASTOS_DE_LA_UNIDAD + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const gastos = gastosDesde(data)
  if (!gastos) {
    return fallo('inesperado', NO_SE_CARGARON_LOS_GASTOS)
  }
  const { filas, hayMas } = cortarAlTope(gastos, TOPE_DE_GASTOS_DE_LA_UNIDAD)
  return ok({ gastos: filas, hayMas })
}

// `margen_vehiculo`: pide `logistica.margen.ver` del origen (42501 si no).
export async function leerMargen(vehiculoId: string): Promise<Resultado<Margen>> {
  const { data, error } = await createClient().rpc('margen_vehiculo', { p_vehiculo: vehiculoId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const margen = margenDesde(data)
  return margen ? ok(margen) : fallo('inesperado', NO_SE_CARGO_EL_MARGEN)
}
