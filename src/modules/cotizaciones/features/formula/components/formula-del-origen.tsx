'use client'

import type { FormulaDelOrigen as Formula } from '../../../entities/formula/versiones'
import { usePanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { AccionesDeLaFormula } from './acciones-de-la-formula'
import { EditorDeLaFormulaDiferido } from './diferidos'
import { VistaDeLaFormula } from './vista-de-la-formula'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // Los orígenes donde quien mira configura la fórmula (al menos uno), en el orden del catálogo.
  origenes: readonly Origen[]
  origen: Origen
  formula: Formula
}

// Sobre qué versión se edita: el borrador o, sin él, la publicada.
const sobreQue = (formula: Formula) =>
  formula.borrador
    ? `Sobre el borrador de ${formula.borrador.autor}.`
    : `Sobre la versión ${String(formula.publicada?.version ?? '')} publicada.`

// La pestaña «Fórmula» de Configuración › Cotización (4.20-2a): el origen, su publicada, su borrador y sus versiones (`VistaDeLaFormula`). Desde el borrador se
// publica y desde una archivada se revierte (4.20-2b, `?panel=publicar-formula`, `?panel=revertir-formula&version=<id>`); el borrador se descarta (4.20-2c,
// `?panel=descartar-borrador`). Con `?panel=editar-formula` (4.21-3a-1), el editor en texto ocupa el lugar del selector, las tarjetas y la lista: edita el
// borrador o, sin él, la publicada.
export function FormulaDelOrigen({ origenes, origen, formula }: Props) {
  const panel = usePanelDeLaFormula()
  const sobre = formula.borrador ?? formula.publicada
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-0.5">
        <h2 className="text-(length:--text-lg) font-semibold text-(--color-ink)">Fórmula</h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          La versión con la que se cotiza en cada origen, su borrador y las versiones anteriores.
        </p>
      </div>
      {panel.editando && sobre ? (
        <EditorDeLaFormulaDiferido
          key={sobre.id}
          origen={origen}
          formulaId={sobre.id}
          sobre={sobreQue(formula)}
          alVolver={panel.cerrar}
        />
      ) : (
        <VistaDeLaFormula origenes={origenes} origen={origen} formula={formula} panel={panel} />
      )}
      <AccionesDeLaFormula panel={panel} origen={origen} formula={formula} />
    </div>
  )
}
