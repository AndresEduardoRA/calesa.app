import type { CeldaDeHoja } from '../../../entities/hoja'

// El botón «Ayuda de X» de esa celda, para devolverle el foco al cerrar su panel (la `XCell` no lo mueve: emite `onHelp` y nada más). Si no está, el foco que dé el diálogo.
export const botonDeAyuda = (celda: CeldaDeHoja) =>
  [
    ...document.querySelectorAll<HTMLElement>(`[data-nodo="${CSS.escape(celda.nodo)}"] button`),
  ].find((boton) => boton.getAttribute('aria-label') === `Ayuda de ${celda.etiqueta}`) ?? true
