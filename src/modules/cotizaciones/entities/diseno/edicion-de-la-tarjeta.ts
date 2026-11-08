// Editar la tarjeta del total (4.22-3): qué nodo es el total y qué se muestra junto a él. El total es un nodo con `salida: 'total'` y cada secundario uno con
// `salida: 'aparte'` (`validarDiseno()` lo exige). Nada muta lo que recibe.
import type { Diseno } from '../diseno'
import type { Definicion } from '../formula'

export type NodoDeLaTarjeta = { id: string; etiqueta: string }

const conSalida = (definicion: Definicion, salida: 'total' | 'aparte'): NodoDeLaTarjeta[] =>
  definicion.nodos
    .filter((n) => n.salida === salida)
    .map((n) => ({ id: n.id, etiqueta: n.etiqueta }))

export const totalesPosibles = (definicion: Definicion) => conSalida(definicion, 'total')
export const apartesPosibles = (definicion: Definicion) => conSalida(definicion, 'aparte')

export const ponerTotalDeLaTarjeta = (diseno: Diseno, nodo: string): Diseno => ({
  ...diseno,
  tarjeta_total: { ...diseno.tarjeta_total, nodo },
})

// Agrega al final o quita; sin repetir.
export function alternarSecundario(diseno: Diseno, nodo: string): Diseno {
  const { secundarios } = diseno.tarjeta_total
  return {
    ...diseno,
    tarjeta_total: {
      ...diseno.tarjeta_total,
      secundarios: secundarios.includes(nodo)
        ? secundarios.filter((s) => s !== nodo)
        : [...secundarios, nodo],
    },
  }
}
