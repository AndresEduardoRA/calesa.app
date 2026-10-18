// El «⋯» de un vehículo, dicho una sola vez: qué acciones tiene, en qué orden y cuáles se ven. La fila del inventario, la tarjeta, el resumen y
// la ficha dibujan esta lista (`features/acciones/components/menu-de-vehiculo.tsx`); ninguna escribe la suya. Es la de los leads
// (`leads/entities/acciones-de-lead.ts`) con lo que ya existe de un vehículo: lo que se hace seguido arriba, lo destructivo al final y separado.
// Lo que una persona no puede hacer no aparece (los permisos no cambian: salen de `editablesDe()`, `permisoDeVitrina()` y `permisoDePapelera()`).

export type ClaveDeAccionDeVehiculo = 'editar' | 'publicar' | 'papelera'

export const ETIQUETA_DE_ACCION_DE_VEHICULO: Readonly<Record<ClaveDeAccionDeVehiculo, string>> = {
  editar: 'Editar',
  // Abre el panel de la vitrina, con su vista previa: lleva «…».
  publicar: 'Publicar en la web…',
  papelera: 'Enviar a la papelera',
}

// El orden, en dos bloques: lo que se hace seguido arriba (editar y publicar) y lo destructivo al final y separado (la papelera).
export const BLOQUES_DEL_MENU_DE_VEHICULO: readonly (readonly ClaveDeAccionDeVehiculo[])[] = [
  ['editar', 'publicar'],
  ['papelera'],
]

// Cómo se ofrece cada una: `oculta` no existe; `apagada` se ve y no se puede (dice por qué, debajo: la ficha de siempre); `habilitada` se puede.
export type OfertaDeAccion = 'oculta' | 'apagada' | 'habilitada'

export type OfertasDelMenuDeVehiculo = Readonly<Record<ClaveDeAccionDeVehiculo, OfertaDeAccion>>

// Las acciones que se ofrecen, por bloques y en su orden (sin bloques vacíos).
export function accionesDeVehiculo(ofertas: OfertasDelMenuDeVehiculo): ClaveDeAccionDeVehiculo[][] {
  return BLOQUES_DEL_MENU_DE_VEHICULO.map((bloque) =>
    bloque.filter((clave) => ofertas[clave] !== 'oculta'),
  ).filter((bloque) => bloque.length > 0)
}
