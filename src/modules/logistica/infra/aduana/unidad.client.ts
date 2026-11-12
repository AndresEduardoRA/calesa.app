// Lo que el hueco «Aduana» de la unidad lee desde el navegador, con la sesión de quien mira (6.09-1): el vínculo vivo de la unidad con su declaración (la RLS de
// `declaraciones_vehiculos` es por vehículo) y, para «Tributos pagados», la declaración leída por `declaracion_leer` (que no revela montos: sólo un sí o no por unidad, D13).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  declaracionDesde,
  esCanalDeAforo,
  type CanalDeAforo,
} from '../../entities/aduana/declaracion'

export const NO_SE_CARGO_LA_ADUANA = 'No se pudo cargar la aduana.'

export type AduanaDeLaUnidad = {
  declaracionId: string
  numero: string
  canal: CanalDeAforo | null
  venceTributosEl: string | null
  pagada: boolean
  // ¿Esta unidad tiene su gasto de tributos? Nulo si la unidad no está entre las 200 que devuelve la base (la declaración trae más): no se adivina (D13).
  tributo: boolean | null
}

// Por `declaraciones_vehiculos_pkey` (declaracion_id, vehiculo_id) y su índice por vehículo, con `limit 1`: una unidad está en una sola declaración viva.
export async function leerAduanaDeLaUnidad(
  vehiculoId: string,
): Promise<Resultado<AduanaDeLaUnidad | null>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('declaraciones_vehiculos')
    .select('declaracion_id, declaraciones_aduana(id, numero, canal, vence_tributos_el)')
    .eq('vehiculo_id', vehiculoId)
    .is('removido_en', null)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const vinculo = data[0]
  const cabecera = vinculo?.declaraciones_aduana
  if (!vinculo || !cabecera) {
    return ok(null)
  }
  const leida = await supabase.rpc('declaracion_leer', { p_id: vinculo.declaracion_id })
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  const declaracion = declaracionDesde(leida.data)
  if (declaracion === null) {
    return fallo('inesperado', NO_SE_CARGO_LA_ADUANA)
  }
  const propia = declaracion.vehiculos.find((v) => v.vehiculoId === vehiculoId)
  return ok({
    declaracionId: cabecera.id,
    numero: cabecera.numero,
    canal: esCanalDeAforo(cabecera.canal) ? cabecera.canal : null,
    venceTributosEl: cabecera.vence_tributos_el,
    pagada: declaracion.pagada,
    tributo: propia?.tributo ?? null,
  })
}
