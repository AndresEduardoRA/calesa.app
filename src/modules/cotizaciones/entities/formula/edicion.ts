// El editor de la fórmula en texto (4.21-3a-1; docs/UX.md › «Cotización: fórmula»): el panel de la URL y lo que el editor lee de una versión (la del borrador o,
// sin borrador, la publicada). Sólo tipos y la constante; lo puro de editar una fila es de `compilar-fila.ts` y `texto-vigente.ts` (4.21-1).
import type { Diseno } from '../diseno'
import type { Formula } from '../formula'

export const PANEL_EDITAR_FORMULA = 'editar-formula'

// Sobre qué guarda el editor (4.21-3b-1): la versión leída, con su `actualizado_en` (el texto de la base: nunca pasa por `Date`), su estado, su diseño y su nota.
// Sobre la publicada, guardar crea el borrador con su diseño; sobre el borrador, lo pisa con su hora, su diseño y su nota (la RPC los escribe tal cual).
export type BaseDelEditor = {
  id: string
  actualizadoEn: string
  estado: 'borrador' | 'publicada'
  diseno: Diseno | null
  nota: string | null
}

// La versión que se edita: su base y la fórmula partida en constantes y tablas. El borrador local va por su id y su hora.
export type FormulaParaEditar = BaseDelEditor & { formula: Formula }
