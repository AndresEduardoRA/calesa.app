import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeVistaPrevia, LectorDeVitrinaDelOrigen } from '../../entities/repositorios'
import { vistaPreviaDesde, vitrinaDelOrigenDesde } from '../../entities/vitrina'

// Lo que un visitante vería de este vehículo, y por qué no lo ve. Sale de la misma vista que
// alimenta `web.vehiculos`: la app no lee el esquema `interno`, se lo pide a la base.
export const getVistaPrevia: LectorDeVistaPrevia = async (vehiculoId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_vitrina_previa', { p_vehiculo: vehiculoId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(vistaPreviaDesde(data))
}

// Las condiciones que no son del vehículo: con ellas el listado sabe cuáles de sus filas
// publicadas se ven, y arma el filtro «En vitrina».
export const getVitrinaDelOrigen: LectorDeVitrinaDelOrigen = async (origenId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vitrina_del_origen', { p_origen: origenId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(vitrinaDelOrigenDesde(data))
}
