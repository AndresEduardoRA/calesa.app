'use client'

import type { Etapa } from '../../../entities/embudo'
import type { PanelDeEtapas } from '../hooks/use-panel-de-etapas'

const CASILLA = 'inline-flex min-h-11 items-center gap-1.5 text-(length:--text-sm) md:min-h-8'

type Props = { etapa: Etapa; indice: number; grupo: string; panel: PanelDeEtapas }

// Inicial (una sola en el embudo: radios del mismo grupo), ganada o perdida.
export function MarcasDeEtapa({ etapa, indice, grupo, panel }: Props) {
  return (
    <>
      <label className={CASILLA}>
        <input
          type="radio"
          name={grupo}
          checked={etapa.esInicial}
          onChange={() => {
            panel.marcarInicial(indice)
          }}
        />
        Inicial
      </label>
      <label className={CASILLA}>
        <input
          type="checkbox"
          checked={etapa.esGanada}
          onChange={(evento) => {
            panel.marcarFinal(indice, 'ganada', evento.target.checked)
          }}
        />
        Ganada
      </label>
      <label className={CASILLA}>
        <input
          type="checkbox"
          checked={etapa.esPerdida}
          onChange={(evento) => {
            panel.marcarFinal(indice, 'perdida', evento.target.checked)
          }}
        />
        Perdida
      </label>
    </>
  )
}
