'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_ETAPA_A_MOVER,
  CLAVE_DE_OPORTUNIDAD,
  PANEL_MOVER_OPORTUNIDAD,
} from '../../../entities/oportunidad'

// «Mover a …» una etapa perdida, que pregunta el motivo, en la URL (`?panel=mover-oportunidad&oportunidad=<id>&destino=<id>`).
// Lo monta quien tiene las oportunidades (el kanban, la sección de la ficha): una sola vez, no una por tarjeta. Abrir suma
// al historial («atrás» lo cierra).
export function usePanelDeMovida() {
  const panel = usePanelPorUrl(PANEL_MOVER_OPORTUNIDAD, [
    CLAVE_DE_OPORTUNIDAD,
    CLAVE_DE_ETAPA_A_MOVER,
  ])
  return {
    abierto: panel.abierto,
    oportunidad: panel.valor(CLAVE_DE_OPORTUNIDAD),
    etapa: panel.valor(CLAVE_DE_ETAPA_A_MOVER),
    // Pide el motivo para mover `oportunidad` a `etapa` (cualquier cosa con id: una tarjeta, una oportunidad de la ficha).
    pedir: (oportunidad: { id: string }, etapa: { id: string }) => {
      panel.abrir({ [CLAVE_DE_OPORTUNIDAD]: oportunidad.id, [CLAVE_DE_ETAPA_A_MOVER]: etapa.id })
    },
    cerrar: panel.cerrar,
  }
}

export type PanelDeMovida = ReturnType<typeof usePanelDeMovida>
