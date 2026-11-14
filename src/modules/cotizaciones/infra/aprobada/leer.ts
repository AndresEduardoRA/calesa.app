import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_LA_MARCA,
  aprobadasDelVehiculoDesde,
  idsAprobadosDesde,
  marcaDeLaGuardadaDesde,
} from '../../entities/aprobada/lectura'
import type {
  CotizacionAprobadaDelVehiculo,
  MarcaDeLaGuardada,
} from '../../entities/aprobada/tipos'

// Las lecturas de la aprobada, con el cliente de quien mira: la policy de `cotizaciones_aprobadas` espeja la de `cotizaciones`, así que cada quien lee sólo las de las
// cotizaciones que ve. Siempre por una página ya cortada (≤ 100 ids): una consulta, ninguna por fila.

const NO_SE_LEYO = 'No se pudo leer la cotización aprobada.'

// La aprobada de cada vehículo de una página del inventario, por `cotizaciones_aprobadas_pkey (vehiculo_id)`. Un vehículo sin fila no sale: «—».
export async function getAprobadasDeVehiculos(
  vehiculoIds: readonly string[],
): Promise<Resultado<CotizacionAprobadaDelVehiculo[]>> {
  if (vehiculoIds.length === 0) {
    return ok([])
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cotizaciones_aprobadas')
    .select('vehiculo_id, cotizacion_id, monto::text, moneda')
    .in('vehiculo_id', [...vehiculoIds])
    .limit(vehiculoIds.length)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = aprobadasDelVehiculoDesde(data)
  return filas ? ok(filas) : fallo('inesperado', NO_SE_LEYO)
}

// Cuáles de las cotizaciones de una página del listado son la aprobada de su vehículo, por el único `cotizaciones_aprobadas_cotizacion_id_key`.
export async function getAprobadasDeCotizaciones(
  cotizacionIds: readonly string[],
): Promise<Resultado<ReadonlySet<string>>> {
  if (cotizacionIds.length === 0) {
    return ok(new Set<string>())
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cotizaciones_aprobadas')
    .select('cotizacion_id')
    .in('cotizacion_id', [...cotizacionIds])
    .limit(cotizacionIds.length)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const ids = idsAprobadosDesde(data)
  return ids ? ok(ids) : fallo('inesperado', NO_SE_LEYO)
}

// El estado de una guardada y si es la aprobada: una lectura por `cotizaciones_pkey` con el embebido por el único de `cotizaciones_aprobadas`. La usa el hueco de la
// guardada en el mismo render, por eso `cache`.
export const getMarcaDeLaGuardada = cache(
  async (cotizacionId: string): Promise<Resultado<MarcaDeLaGuardada>> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(COLUMNAS_DE_LA_MARCA)
      .eq('id', cotizacionId)
      .limit(1)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const marca = marcaDeLaGuardadaDesde(data)
    return marca ? ok(marca) : fallo('inesperado', NO_SE_LEYO)
  },
)
