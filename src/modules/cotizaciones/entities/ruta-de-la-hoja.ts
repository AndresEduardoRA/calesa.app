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

// El listado `/cotizaciones` (4.16-4a): sin vehículo es el listado entero; con él, el camino a lo antiguo del historial de un vehículo (`?vehiculo=`, que no es un filtro del
// esquema: ni chip ni lo borra «Limpiar»). El único lugar que escribe esa ruta.
export const RUTA_DEL_LISTADO = '/cotizaciones'

// Con `lead` (4.17-4b), el de la sección «Cotizaciones» de la ficha del lead; con los dos, el lead primero.
export function rutaDelListado(datos: { vehiculo?: string; lead?: string }): string {
  const parametros = new URLSearchParams()
  if (datos.lead !== undefined) {
    parametros.set(CLAVE_DE_LEAD, datos.lead)
  }
  if (datos.vehiculo !== undefined) {
    parametros.set(CLAVE_DE_VEHICULO, datos.vehiculo)
  }
  const consulta = parametros.toString()
  return consulta === '' ? RUTA_DEL_LISTADO : `${RUTA_DEL_LISTADO}?${consulta}`
}

// La página de una cotización guardada (`/cotizaciones/[id]`, 4.15-3): de ahí se ve y se edita. El único lugar que escribe esa ruta.
export const rutaDeLaCotizacion = (id: string): string => `/cotizaciones/${id}`

// El PDF de una cotización guardada (4.18-3a): bajo su página, lo arma el route handler con lo guardado. El único lugar que escribe esa ruta (la usa «Descargar PDF», 4.18-3b).
export const rutaDelPdf = (id: string): string => `${rutaDeLaCotizacion(id)}/pdf`
