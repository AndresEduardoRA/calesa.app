// El historial de cotizaciones de un vehículo (4.14-2b): las cotizaciones que quien mira ve (la RLS de `cotizaciones` decide cuáles), de la más nueva a la
// más vieja, con quién la hizo y su clase. Lo lee el panel del vehículo de la hoja de cotizar y «Cotizado (n)» cuenta la primera página.
import { z } from 'zod'

// Lo que se pide de cada cotización: sólo columnas con `grant select` para `authenticated`, y el autor embebido por su clave foránea (`perfiles` la lee todo
// usuario activo). Ninguna columna oculta (`valores`, `totales`…), así que no entra al inventario de `cotizaciones-visibilidad.sql`.
export const COLUMNAS_DEL_HISTORIAL =
  'id, numero, clase, creado_en, perfiles!cotizaciones_creado_por_fkey(nombre, email)'

export const ETIQUETA_DE_CLASE = { preventa: 'Preventa', final: 'Final' } as const

export type CotizacionDelHistorial = {
  id: string
  numero: number
  clase: keyof typeof ETIQUETA_DE_CLASE
  creadoEn: string
  autor: string
}

const esquemaDelHistorial = z.array(
  z.object({
    id: z.guid(),
    numero: z.number(),
    clase: z.enum(['preventa', 'final']),
    creado_en: z.string(),
    perfiles: z.object({ nombre: z.string(), email: z.string() }).nullable(),
  }),
)

// Cómo llamar a quien cotizó: su nombre o, si no lo cargó, la parte local de su correo. Es la regla de `nombreVisible()` de
// `equipo/entities/sesion.ts`, copiada porque `equipo` no la entrega al navegador y un módulo no importa otro por dentro: si una cambia, cambia la otra.
export function autorVisible(persona: { nombre: string; email: string } | null): string {
  return persona?.nombre.trim() || persona?.email.split('@')[0] || 'Sin nombre'
}

// Las filas en el orden en que llegaron. Una que no cumple (otra clase, sin fecha) hace de la lectura un error (`null`), no una fila: el cursor no sabría por dónde seguir.
export function historialDesde(filas: unknown): CotizacionDelHistorial[] | null {
  const leidas = esquemaDelHistorial.safeParse(filas)
  if (!leidas.success) {
    return null
  }
  return leidas.data.map((fila) => ({
    id: fila.id,
    numero: fila.numero,
    clase: fila.clase,
    creadoEn: fila.creado_en,
    autor: autorVisible(fila.perfiles),
  }))
}
