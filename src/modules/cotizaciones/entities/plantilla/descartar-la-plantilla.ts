// Descartar el borrador de la plantilla de la tarjeta desde Configuración › Cotización › «Tarjeta» (4.19-3c): el panel de la URL, por qué no se abre y los textos del
// `<Confirmar>`. Borrarlo no toca la publicada; el permiso, la versión esperada y el borrado son de `plantilla_descartar_borrador()`. El PT409 no dice quién (P1).

export const PANEL_DESCARTAR_PLANTILLA = 'descartar-plantilla'

// Sin respuesta del servidor no se sabe si llegó a borrar (pudo cortarse la vuelta): no se dice que el borrador sigue.
export const MENSAJE_SIN_RED_AL_DESCARTAR_LA_PLANTILLA =
  'No sabemos si se descartó: recarga para verlo.'

// `?panel=descartar-plantilla` se revisa al llegar: sin borrador, no abre.
export function motivoParaNoAbrirDescartar(esperada: string | null): string | null {
  return esperada === null ? 'No hay borrador para descartar.' : null
}

// Con el diálogo abierto, tras «Recargar»: el borrador ya no está. Se dice y no deja confirmar.
export function noDisponibleAlDescartar(esperada: string | null): string | null {
  return esperada === null ? 'El borrador ya no está: otra persona lo publicó o lo descartó.' : null
}

export function tituloDelDescarte(origen: string): string {
  return `Descartar el borrador de la tarjeta de ${origen}`
}

// Cuándo se guardó (la fecha ya escrita), que no se deshace y que la publicada no cambia.
export function descripcionDelDescarte(fecha: string): string {
  return `Guardado el ${fecha}. Se borra y no se puede deshacer; la tarjeta publicada no cambia.`
}
