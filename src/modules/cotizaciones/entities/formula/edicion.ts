// El editor de la fórmula en texto (4.21-3a-1; docs/UX.md › «Cotización: fórmula»): el panel de la URL y lo que el editor lee de una versión (la del borrador o,
// sin borrador, la publicada). Sólo tipos y la constante; lo puro de editar una fila es de `compilar-fila.ts` y `texto-vigente.ts` (4.21-1).
import type { Formula } from '../formula'

export const PANEL_EDITAR_FORMULA = 'editar-formula'

// La versión que se edita: su id, su `actualizado_en` (el texto de la base; el borrador local va por él) y la fórmula partida en constantes y tablas.
export type FormulaParaEditar = {
  id: string
  actualizadoEn: string
  formula: Formula
}
