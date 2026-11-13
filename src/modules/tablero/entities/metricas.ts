// Lo que devuelven las RPC del tablero (`tablero_leads` y `tablero_cotizaciones`, 9.07; `tablero_margen` y `tablero_cola_web`, 9.11) y la
// interfaz con que `features/` las pide.
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

// Un monto en moneda base: nulo sin vehículos («Sin venta registrada», nunca 0). El margen puede ser negativo.
const monto = z.number().nullable()
const montosDelMargen = {
  vehiculos: conteo,
  venta: monto,
  real: monto,
  cotizado: monto,
  margen: monto,
  sin_venta: conteo,
}

export const esquemaDeMargenDelMes = z.object({
  desde: dia,
  hasta: dia,
  zona: z.string(),
  moneda: z.string(),
  ...montosDelMargen,
  por_origen: z.array(z.object({ origen_id: z.guid(), nombre: z.string(), ...montosDelMargen })),
  por_origen_hay_mas: z.boolean(),
})

export type MargenDelMes = z.infer<typeof esquemaDeMargenDelMes>

// Sin token, UTM, lead ni WhatsApp: la RPC no los manda y aquí no se leen.
const tasa = z.number().min(0).max(1).nullable()
const minutos = z.number().nullable()

export const esquemaDeColaWeb = z.object({
  desde: dia,
  hasta: dia,
  zona: z.string(),
  total: conteo,
  por_estado: z.object({
    asignada: conteo,
    contactada: conteo,
    vencida: conteo,
    sin_asignar: conteo,
    cancelada: conteo,
  }),
  directas: conteo,
  asignadas: conteo,
  contactadas: conteo,
  tasa,
  mediana_minutos: minutos,
  por_persona: z.array(
    z.object({
      usuario_id: z.guid(),
      nombre: z.string().nullable(),
      asignadas: conteo,
      contactadas: conteo,
      tasa,
      mediana_minutos: minutos,
    }),
  ),
  por_persona_hay_mas: z.boolean(),
})

export type ColaWebDelPeriodo = z.infer<typeof esquemaDeColaWeb>
export type EstadoDelTurno = keyof ColaWebDelPeriodo['por_estado']

// Lo que `features/` necesita de afuera; la implementación (Supabase) vive en `infra/queries/metricas.ts`.
export type RepositorioDeMetricas = {
  leads(desde: string, hasta: string): Promise<Resultado<MetricasDeLeads>>
  cotizaciones(desde: string, hasta: string): Promise<Resultado<MetricasDeCotizaciones>>
  margen(desde: string, hasta: string): Promise<Resultado<MargenDelMes>>
  colaWeb(desde: string, hasta: string): Promise<Resultado<ColaWebDelPeriodo>>
}
