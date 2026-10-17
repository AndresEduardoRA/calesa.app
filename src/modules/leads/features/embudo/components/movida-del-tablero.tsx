'use client'

import { MovidaConMotivo } from '../../oportunidades/components/movida-con-motivo'
import type { PanelDeMovida } from '../../oportunidades/hooks/use-panel-de-movida'
import type { Tarjeta } from '../../../entities/tablero'
import type { EstadoDelTablero } from '../hooks/use-tablero'

type Props = { panel: PanelDeMovida; estado: EstadoDelTablero }

// El modal del motivo del kanban: la oportunidad es una tarjeta cargada de cualquier columna, y sus etapas las del tablero.
export function MovidaDelTablero({ panel, estado }: Props) {
  const { tablero, moverA } = estado
  const etapas = tablero.columnas.map((c) => c.etapa)
  const tarjetaDe = (id: string): Tarjeta | null =>
    tablero.columnas.flatMap((c) => c.tarjetas).find((t) => t.id === id) ?? null
  return (
    <MovidaConMotivo
      panel={panel}
      buscar={(id) => {
        const t = tarjetaDe(id)
        return t ? { id: t.id, titulo: t.titulo, etapaId: t.etapaId, etapas } : null
      }}
      alMover={(id, etapaId, motivo) => {
        const t = tarjetaDe(id)
        return t ? moverA(t, etapaId, motivo) : Promise.resolve(false)
      }}
    />
  )
}
