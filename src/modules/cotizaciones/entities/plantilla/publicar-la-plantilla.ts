// Publicar el borrador de la plantilla de la tarjeta desde Configuración › Cotización › «Tarjeta» (4.19-3c): el panel de la URL, por qué no se abre, por qué «Publicar…»
// está apagado y los textos del modal. La regla de verdad (el permiso, la nota, la versión esperada, la validación contra la fórmula) es de `plantilla_publicar()`:
// esto sólo evita pedir lo que la base va a rechazar y dice por qué con el modal a la vista.

export const PANEL_PUBLICAR_TARJETA = 'publicar-tarjeta'

export const MOTIVO_SIN_BORRADOR_PARA_PUBLICAR = 'Guarda un borrador para poder publicarlo.'
export const MOTIVO_CAMBIOS_SIN_GUARDAR_PARA_PUBLICAR = 'Guarda los cambios para poder publicarlos.'

// Por qué «Publicar…» está apagado (a la vista, junto al botón), o nulo si se puede: primero que no hay borrador; después, que lo que se ve no es lo guardado.
export function motivoParaNoPublicar({
  esperada,
  hayCambios,
}: {
  esperada: string | null
  hayCambios: boolean
}): string | null {
  if (esperada === null) return MOTIVO_SIN_BORRADOR_PARA_PUBLICAR
  return hayCambios ? MOTIVO_CAMBIOS_SIN_GUARDAR_PARA_PUBLICAR : null
}

// `?panel=publicar-tarjeta` se revisa al llegar: sin borrador, no abre.
export function motivoParaNoAbrirPublicar(esperada: string | null): string | null {
  return esperada === null ? 'No hay borrador para publicar.' : null
}

// Con el modal abierto, tras «Recargar»: el borrador ya no está (otra persona lo publicó o lo descartó). El modal lo dice y no deja publicar.
export function noDisponibleAlPublicar(esperada: string | null): string | null {
  return esperada === null ? 'El borrador ya no está: otra persona lo publicó o lo descartó.' : null
}

export function tituloDePublicar(origen: string): string {
  return `Publicar la tarjeta de ${origen}`
}

// El borrador que se publica (su fecha ya escrita) y lo que cambia; lo sin guardar del editor no entra.
export function descripcionDePublicar(origen: string, fecha: string): string {
  return `Se publica el borrador guardado el ${fecha}. Pasa a ser la tarjeta con la que se dibujan las cotizaciones de ${origen}. Lo que tengas sin guardar en el editor no se publica.`
}
