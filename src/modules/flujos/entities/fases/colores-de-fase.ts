// La paleta cerrada de colores de una fase (D7): los de la semilla y el neutro de `fase_crear()`. Cada baldosa lleva su nombre dicho con texto: el
// color solo no basta. Un color fuera de la paleta (una fase vieja) se conserva como «Otro» mientras no se toque.
import { COLOR_NEUTRO_DE_FASE } from './reglas-de-fase'

export type ColorDeFase = { valor: string; nombre: string }

export const COLORES_DE_FASE: readonly ColorDeFase[] = [
  { valor: '#465fff', nombre: 'Azul' },
  { valor: '#7a5af8', nombre: 'Violeta' },
  { valor: '#c7680a', nombre: 'Cobre' },
  { valor: '#0e7490', nombre: 'Turquesa' },
  { valor: '#f04438', nombre: 'Rojo' },
  { valor: '#f79009', nombre: 'Naranja' },
  { valor: '#027a48', nombre: 'Verde' },
  { valor: COLOR_NEUTRO_DE_FASE, nombre: 'Gris' },
]

function mismoColor(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

export function colorDeLaPaleta(valor: string): ColorDeFase | null {
  return COLORES_DE_FASE.find((c) => mismoColor(c.valor, valor)) ?? null
}

// Las baldosas que se dibujan: la paleta y, si el color actual no es de ella, una más «Otro (#rrggbb)» al final.
export function coloresParaElegir(actual: string): readonly ColorDeFase[] {
  return colorDeLaPaleta(actual) === null
    ? [...COLORES_DE_FASE, { valor: actual, nombre: `Otro (${actual})` }]
    : COLORES_DE_FASE
}
