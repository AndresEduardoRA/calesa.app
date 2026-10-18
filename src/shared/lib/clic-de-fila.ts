// Qué clics dentro de una fila o una tarjeta de lista abren su resumen y cuáles no (`.claude/rules/ui.md`, patrón de lista).
// Abre un clic en cualquier parte de la fila; no abre el que es de algo que la fila tiene adentro: una casilla, el «⋯»,
// un enlace o un botón propio. El botón del nombre se marca con `data-abre-resumen`: su clic sube a la fila y abre una sola vez
// (el teclado también: Enter sobre un botón es un clic).
const DE_LA_FILA =
  'a[href], button, input, select, textarea, label, summary, [role="menuitem"], [role="checkbox"], [role="button"], [data-no-abre]'

type ClicEnUnaFila = { target: EventTarget | null; currentTarget: Element }

export function esClicPropio({ target, currentTarget }: ClicEnUnaFila): boolean {
  if (!(target instanceof Element)) {
    return false
  }
  // React sube los eventos de un portal por el árbol de componentes: el menú del «⋯» y los selectores que se abren desde una
  // fila viven fuera de ella en el DOM, y nada de lo que pasa ahí abre la fila.
  if (!currentTarget.contains(target)) {
    return true
  }
  const propio = target.closest(DE_LA_FILA)
  return (
    propio !== null && currentTarget.contains(propio) && !propio.hasAttribute('data-abre-resumen')
  )
}
