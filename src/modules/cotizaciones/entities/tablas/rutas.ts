// Las URL de la pestaña «Tablas» de Configuración › Cotización (4.23-3): la lista de un origen y el editor de una tabla.
import type { Route } from 'next'
import { RUTAS } from '@/shared/lib/rutas'

// `?seccion=tablas&origen=<id>`, y con `tablaId`, `&tabla=<id>` (abre su editor).
export function rutaDeLasTablas(origenId: string, tablaId?: string): Route {
  const consulta = new URLSearchParams({ seccion: 'tablas', origen: origenId })
  if (tablaId) consulta.set('tabla', tablaId)
  return `${RUTAS.configuracionDeCotizacion}?${consulta.toString()}` as Route
}
