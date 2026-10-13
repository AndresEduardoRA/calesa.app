import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { envioDesde, purgaDesde, restauracionDesde } from '../entities/papelera'
import type { RepositorioPapelera } from '../entities/repositorios'

// La papelera de vehículos se escribe sólo por RPC (`…000800_papelera_vehiculos.sql` y
// `…000900_papelera_purga.sql`). Enviar lleva la versión de cada vehículo; restaurar y purgar, la
// del lote. Las tres devuelven un resultado parcial: lo que no pasó vuelve con su motivo.

const enviar: RepositorioPapelera['enviar'] = async (vehiculos) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculos_papelera_enviar', {
    p_vehiculos: vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      actualizado_en: vehiculo.actualizadoEn,
    })),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(envioDesde(data))
}

const restaurar: RepositorioPapelera['restaurar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculos_papelera_restaurar', {
    p_lote: pedido.loteId,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    // Sin la lista es el lote entero (el valor por defecto del parámetro es nulo).
    ...(pedido.vehiculos ? { p_vehiculos: [...pedido.vehiculos] } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(restauracionDesde(data))
}

const purgar: RepositorioPapelera['purgar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculos_papelera_purgar', {
    p_lote: pedido.loteId,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    ...(pedido.vehiculos ? { p_vehiculos: [...pedido.vehiculos] } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(purgaDesde(data))
}

export const papeleraSupabase: RepositorioPapelera = { enviar, restaurar, purgar }
