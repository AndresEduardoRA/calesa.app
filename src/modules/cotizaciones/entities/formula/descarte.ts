// Descartar el borrador de la fórmula de un origen desde Configuración › Cotización › «Fórmula» (4.20-2c): el panel de la URL, por qué no se abre y los textos del
// `<Confirmar>`. Borrarlo no toca la publicada; el permiso y el borrado son de `formula_descartar_borrador()`, que borra el borrador del origen sin versión esperada
// (P1 del 4.20-2c: la esperada llega en el 4.21, con la de `formula_guardar_borrador()`). Lo descarta todo el que configura el origen (P2), también uno atrasado.
import type { EstadoDeLaFormula } from './versiones'

export const PANEL_DESCARTAR_BORRADOR = 'descartar-borrador'

// Sin respuesta del servidor no se sabe si llegó a borrar (pudo cortarse la vuelta): no se dice que el borrador sigue.
export const MENSAJE_SIN_RED_AL_DESCARTAR = 'No sabemos si se descartó: recarga para verlo.'

// `?panel=descartar-borrador` se revisa al llegar: sin borrador, no abre.
export function motivoParaNoAbrirDescartar(estado: EstadoDeLaFormula): string | null {
  return estado.borrador ? null : 'No hay borrador para descartar.'
}

// El diálogo nombra el borrador: de quién es…
export function tituloDelDescarte(autor: string): string {
  return `Descartar el borrador de ${autor}`
}

// …cuándo se guardó (la fecha relativa ya escrita), que no se deshace y que la publicada no cambia.
export function descripcionDelDescarte(guardado: string): string {
  return `Guardado ${guardado}. Se borra y no se puede deshacer; la versión publicada no cambia.`
}
