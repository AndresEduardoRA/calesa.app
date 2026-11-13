import 'server-only'
import type { z } from 'zod'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  esquemaDeColaWeb,
  esquemaDeMargenDelMes,
  esquemaDeMetricasDeCotizaciones,
  esquemaDeMetricasDeLeads,
  type RepositorioDeMetricas,
} from '../../entities/metricas'

// Una RPC por grupo de widgets, nunca N consultas (`tablero_leads`, `tablero_cotizaciones`,
// `tablero_margen` y `tablero_cola_web`). Las dos primeras piden `tablero.metricas.ver`; la del margen,
// `logistica.margen.ver` y sólo mira sus orígenes; la de la cola, `web.cola.gestionar` (42501). Todas, una ventana de hasta 366 días
// (22023). Sin `.from()` sobre tablas.
async function leer<Esquema extends z.ZodType>(
  funcion: 'tablero_leads' | 'tablero_cotizaciones' | 'tablero_margen' | 'tablero_cola_web',
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
  margen: (desde, hasta) => leer('tablero_margen', esquemaDeMargenDelMes, desde, hasta),
  colaWeb: (desde, hasta) => leer('tablero_cola_web', esquemaDeColaWeb, desde, hasta),
}
