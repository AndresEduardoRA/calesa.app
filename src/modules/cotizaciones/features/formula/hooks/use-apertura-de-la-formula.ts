'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { motivoParaNoAbrirPublicar } from '../../../entities/formula/publicacion'
import { motivoParaNoAbrirRevertir, versionParaRevertir } from '../../../entities/formula/reversion'
import type { FormulaDelOrigen } from '../../../entities/formula/versiones'
import type { PanelDeLaFormula } from './use-panel-de-la-formula'

type Modo = 'publicar' | 'revertir' | null

function motivoDe(modo: Modo, panel: PanelDeLaFormula, formula: FormulaDelOrigen) {
  if (modo === 'publicar') {
    return motivoParaNoAbrirPublicar(formula)
  }
  if (modo === 'revertir') {
    return motivoParaNoAbrirRevertir(panel.versionPedida, {
      publicadaId: formula.publicada?.id ?? null,
      archivadas: formula.versiones.filas,
      elegida: panel.elegida,
    })
  }
  return null
}

// Qué modal de la pestaña «Fórmula» abre según la URL. Se revisa una vez, al llegar: lo que no se puede abrir (publicar sin borrador o con uno atrasado; revertir sin
// publicada, la publicada o una versión que no está en la lista) no abre, se avisa y la URL se limpia. La versión que se revierte se fija al abrir (`useUltimo`): tras
// «Recargar» sigue siendo la misma aunque la lista ya no la traiga.
export function useAperturaDeLaFormula(panel: PanelDeLaFormula, formula: FormulaDelOrigen) {
  const modo: Modo = panel.publicando ? 'publicar' : panel.revirtiendo ? 'revertir' : null
  const apertura = useApertura(modo !== null)
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${panel.versionPedida ?? ''}`,
    motivoDe(modo, panel, formula),
    panel.cerrar,
  )
  const aRevertir = useUltimo(
    modo === 'revertir'
      ? versionParaRevertir(panel.versionPedida, {
          archivadas: formula.versiones.filas,
          elegida: panel.elegida,
        })
      : null,
  )
  return {
    apertura,
    publicando: modo === 'publicar' && !rechazada,
    revirtiendo: modo === 'revertir' && !rechazada && aRevertir !== null,
    aRevertir,
  }
}
