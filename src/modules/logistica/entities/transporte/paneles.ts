// Las claves de URL de `/logistica/embarques` (6.08-3): la vista (`?grupo=embarques|contenedores`) y el resumen abierto (`?booking=<clave>` en embarques, `?contenedor=<clave>` en
// contenedores: las mismas claves que ya usa el lote de `mover`). 6.08-4 suma aquí el panel de «Editar grupo».
export const CLAVE_DE_GRUPO = 'grupo'
export const CLAVE_DE_BOOKING = 'booking'
export const CLAVE_DE_CONTENEDOR = 'contenedor'

export const VISTAS_DE_GRUPOS = ['embarques', 'contenedores'] as const
export type VistaDeGrupos = (typeof VISTAS_DE_GRUPOS)[number]

export const ETIQUETA_DE_VISTA_DE_GRUPOS: Record<VistaDeGrupos, string> = {
  embarques: 'Embarques',
  contenedores: 'Contenedores',
}

/** La vista que dice la URL; cualquier otro valor (o ninguno) es «embarques». */
export function vistaDeGrupos(valor: string | null | undefined): VistaDeGrupos {
  return valor === 'contenedores' ? 'contenedores' : 'embarques'
}

/** La clave de URL del resumen de esa vista. */
export function claveDelResumenDe(vista: VistaDeGrupos): string {
  return vista === 'contenedores' ? CLAVE_DE_CONTENEDOR : CLAVE_DE_BOOKING
}

/** El `p_tipo` de `transporte_grupos()` y `transporte_grupo()`. */
export function tipoDeLaBaseDe(vista: VistaDeGrupos): 'booking' | 'contenedor' {
  return vista === 'contenedores' ? 'contenedor' : 'booking'
}

/** El `tipo` del grupo para los huecos del resumen (`GrupoDeLogistica`). */
export function tipoDeGrupoDeLaVista(vista: VistaDeGrupos): 'embarque' | 'contenedor' {
  return vista === 'contenedores' ? 'contenedor' : 'embarque'
}
