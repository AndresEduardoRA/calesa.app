import 'server-only'
import type { z } from 'zod'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  esquemaDeMetricasDeCotizaciones,
  esquemaDeMetricasDeLeads,
  type RepositorioDeMetricas,
} from '../../entities/metricas'

// Una RPC por grupo de widgets, nunca N consultas (`…20261112110517_tablero_leads.sql` y `…110519_tablero_cotizaciones.sql`):
// piden `tablero.metricas.ver` (42501) y una ventana de hasta 366 días (22023). Sin `.from()` sobre tablas.
async function leer<Esquema extends z.ZodType>(
  funcion: 'tablero_leads' | 'tablero_cotizaciones',
  esquema: Esquema,
  desde: string,
  hasta: string,
): Promise<Resultado<z.infer<Esquema>>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(funcion, { p_desde: desde, p_hasta: hasta })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const forma = esquema.safeParse(data)
  if (!forma.success) {
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
  return { ok: true, data: forma.data }
}

export const repositorioDeMetricas: RepositorioDeMetricas = {
  leads: (desde, hasta) => leer('tablero_leads', esquemaDeMetricasDeLeads, desde, hasta),
  cotizaciones: (desde, hasta) =>
    leer('tablero_cotizaciones', esquemaDeMetricasDeCotizaciones, desde, hasta),
}
