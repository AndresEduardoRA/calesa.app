// Lo que devuelven las RPC del tablero (`tablero_leads` y `tablero_cotizaciones`, 9.07) y la interfaz con que `features/` las pide.
// La respuesta es `jsonb`: se valida en el borde con Zod, nunca se castea. Cero I/O.
import { z } from 'zod'
import type { Resultado } from '@/shared/lib/errores'

const conteo = z.number().int().nonnegative()
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const esquemaDeMetricasDeLeads = z.object({
  desde: dia,
  hasta: dia,
  zona: z.string(),
  creados: conteo,
  convertidos: conteo,
  // Nula cuando no hubo leads en el período: eso es «Sin datos», no 0 %.
  tasa: z.number().min(0).nullable(),
  // Desde cuándo se cuentan los convertidos (los clientes de antes no tienen fecha).
  conversion_desde: z.string().nullable(),
  por_dia: z.array(z.object({ dia, creados: conteo, convertidos: conteo })),
  por_origen: z.array(
    z.object({
      origen_lead_id: z.guid().nullable(),
      nombre: z.string().nullable(),
      creados: conteo,
      convertidos: conteo,
    }),
  ),
  por_origen_hay_mas: z.boolean(),
  por_asesor: z.array(
    z.object({
      usuario_id: z.guid(),
      nombre: z.string().nullable(),
      creados: conteo,
      convertidos: conteo,
    }),
  ),
  por_asesor_hay_mas: z.boolean(),
})

export type MetricasDeLeads = z.infer<typeof esquemaDeMetricasDeLeads>

export const esquemaDeMetricasDeCotizaciones = z.object({
  desde: dia,
  hasta: dia,
  zona: z.string(),
  creadas: conteo,
  finales: conteo,
  por_dia: z.array(z.object({ dia, creadas: conteo, finales: conteo })),
  por_origen: z.array(
    z.object({ origen_id: z.guid(), nombre: z.string(), creadas: conteo, finales: conteo }),
  ),
  por_origen_hay_mas: z.boolean(),
})

export type MetricasDeCotizaciones = z.infer<typeof esquemaDeMetricasDeCotizaciones>

// Lo que `features/` necesita de afuera; la implementación (Supabase) vive en `infra/queries/metricas.ts`.
export type RepositorioDeMetricas = {
  leads(desde: string, hasta: string): Promise<Resultado<MetricasDeLeads>>
  cotizaciones(desde: string, hasta: string): Promise<Resultado<MetricasDeCotizaciones>>
}
