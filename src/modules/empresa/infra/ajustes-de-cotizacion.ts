import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioAjustesDeCotizacion } from '../entities/repositorios'

// Por RPC: la base exige `cotizaciones.configurar` en todos los orígenes, el rango y la versión de la fila (`PT409`).
const guardar: RepositorioAjustesDeCotizacion['guardar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('empresa_guardar_ajustes_de_cotizacion', {
    p_vigencia_dias: pedido.vigenciaDias,
    p_vehiculo_obligatorio: pedido.vehiculoObligatorioAlCotizar,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

export const ajustesDeCotizacionSupabase: RepositorioAjustesDeCotizacion = { guardar }
