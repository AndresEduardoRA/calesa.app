// La URL de la hoja de cotizar (`docs/UX.md` › «Cotizar»): `/cotizaciones/nuevo?origen=&lead=&vehiculo=`. Las claves son nombres de la URL; los ids se validan donde se leen.
export const RUTA_DE_LA_HOJA = '/cotizaciones/nuevo'
export const CLAVE_DE_ORIGEN = 'origen'
export const CLAVE_DE_LEAD = 'lead'
export const CLAVE_DE_VEHICULO = 'vehiculo'

// Cambiar de pestaña de origen conserva el lead (lo elegido desde su ficha) y suelta el vehículo: es de otro origen.
export function rutaDeLaHoja(datos: { origen: string; lead: string | null }): string {
  const parametros = new URLSearchParams({ [CLAVE_DE_ORIGEN]: datos.origen })
  if (datos.lead !== null) {
    parametros.set(CLAVE_DE_LEAD, datos.lead)
  }
  return `${RUTA_DE_LA_HOJA}?${parametros.toString()}`
}
