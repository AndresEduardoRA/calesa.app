import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { ajustesDeCotizacionDesde } from '../../entities/ajustes-de-cotizacion'
import type { LectorDeAjustesDeCotizacion } from '../../entities/repositorios'

// La vigencia y el vehículo obligatorio con la versión de la fila, para su pestaña de Configuración › Cotización. La lee cualquier
// cuenta con sesión; guardarlos pide `cotizaciones.configurar` en todos los orígenes. Si falla, falla: la pestaña muestra el error
// en vez de valores de fábrica que se guardarían encima. `ajustes_empresa` es una fila (tabla acotada).
export const getAjustesDeCotizacion: LectorDeAjustesDeCotizacion = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ajustes_empresa')
    .select('vigencia_dias, vehiculo_obligatorio_al_cotizar, actualizado_en')
    .eq('id', 1)
    .single()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(ajustesDeCotizacionDesde(data))
})
