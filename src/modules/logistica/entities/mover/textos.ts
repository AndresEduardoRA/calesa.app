// Los textos del hueco «Qué falta» (6.04): lo que dice cuando no hay nada que mostrar y cómo se llama a dónde lleva el atajo de una falta. Sin I/O.
export const SIN_FASE = 'Todavía no tiene fase.'
export const SIN_DESTINOS = 'Desde esta fase no hay a dónde mover.'
export const HAY_MAS_DESTINOS = 'Hay más destinos de los que se muestran.'
export const NO_SE_LEYO_QUE_FALTA = 'No pudimos leer lo que falta para mover.'

// El nombre de cada hueco al que un requisito puede mandar (la clave es la de `ORDEN_DE_HUECOS`).
const TITULO_DEL_HUECO: Record<string, string> = {
  documentos: 'Documentos',
  transporte: 'Transporte',
  aduana: 'Aduana',
  pagos: 'Pagos',
}

/** El texto del atajo de una falta: «Ir a Documentos». */
export function textoDelAtajo(ancla: string): string {
  return `Ir a ${TITULO_DEL_HUECO[ancla] ?? ancla}`
}
