// Lo que llega de cada sección del buscador (7.12) y de «Últimos abiertos», validado al cruzar del navegador a la regla. Las columnas son las que
// devuelven las RPC `buscador_*` y las que `authenticated` puede leer por grant: nunca teléfono, campos (`atributos*`) ni montos (`total_base`,
// `moneda_mostrar`, `valores`, `fuentes`, `totales`, `tipos_cambio`). La nulabilidad es la de la tabla, aunque el tipo generado de una función la pierda.
import { z } from 'zod'

// Lo que el buscador busca y recuerda. `visitados.tipo` admite más (`evento`, `tarea`…), pero esos no se leen aquí.
export const TIPOS_DEL_BUSCADOR = ['lead', 'vehiculo', 'cotizacion'] as const
export type TipoDelBuscador = (typeof TIPOS_DEL_BUSCADOR)[number]

// Lo que se pide a `leads_vista_por_ids` (invocadora, recorta teléfono y privados), a `vehiculos` y a `cotizaciones` (con sus columnas con grant).
export const COLUMNAS_DE_LEAD = 'id, nombre, numero_visible'
export const COLUMNAS_DE_VEHICULO = 'id, origen_id, titulo, vin, lote, creado_en'
export const COLUMNAS_DE_COTIZACION = 'id, numero, origen_id, titulo, clase, estado, creado_en'

const filaDeLead = z.object({
  id: z.guid(),
  nombre: z.string().nullable(),
  numero_visible: z.number().int().nullable(),
})

const filaDeVehiculo = z.object({
  id: z.guid(),
  origen_id: z.guid(),
  titulo: z.string(),
  vin: z.string().nullable(),
  lote: z.string().nullable(),
  creado_en: z.string(),
})

const filaDeCotizacion = z.object({
  id: z.guid(),
  numero: z.number().int(),
  origen_id: z.guid(),
  titulo: z.string().nullable(),
  clase: z.string(),
  estado: z.string(),
  creado_en: z.string(),
})

const visita = z.object({
  tipo: z.enum(TIPOS_DEL_BUSCADOR),
  referencia_id: z.guid(),
  visto_en: z.string(),
})

export const ESQUEMAS_DEL_BUSCADOR = {
  lead: z.array(filaDeLead),
  vehiculo: z.array(filaDeVehiculo),
  cotizacion: z.array(filaDeCotizacion),
  ids: z.array(z.guid()),
  visitas: z.array(visita),
} as const

export type FilaDeLead = z.infer<typeof filaDeLead>
export type FilaDeVehiculo = z.infer<typeof filaDeVehiculo>
export type FilaDeCotizacion = z.infer<typeof filaDeCotizacion>
export type Visita = z.infer<typeof visita>
export type FilaPorTipo = {
  lead: FilaDeLead
  vehiculo: FilaDeVehiculo
  cotizacion: FilaDeCotizacion
}

// Lo leído, o `null` si algo no valida (la lectura lo vuelve un error).
export function filasDesde<T>(esquema: z.ZodType<T[]>, data: unknown): T[] | null {
  const leido = esquema.safeParse(data ?? [])
  return leido.success ? leido.data : null
}
