// A dónde lleva cada fila de la paleta (7.13-3). Puro: la paleta navega con estas rutas y no escribe ninguna a mano.
import { RUTAS } from '@/shared/lib/rutas'
import type { TipoDelBuscador } from './resultados'

const BASE: Record<TipoDelBuscador, string> = {
  lead: RUTAS.leads,
  vehiculo: RUTAS.vehiculos,
  cotizacion: RUTAS.cotizaciones,
}

// La ficha de un lead, un vehículo o una cotización: `/leads/<id>`, `/vehiculos/<id>`, `/cotizaciones/<id>`.
export function rutaDeLaFicha(tipo: TipoDelBuscador, id: string): string {
  return `${BASE[tipo]}/${encodeURIComponent(id)}`
}

// «Ver todos en Leads»: el listado con el texto ya interpretado en su filtro de búsqueda (`?q=`).
export function rutaDeVerTodos(texto: string): string {
  return `${RUTAS.leads}?${new URLSearchParams({ q: texto }).toString()}`
}
