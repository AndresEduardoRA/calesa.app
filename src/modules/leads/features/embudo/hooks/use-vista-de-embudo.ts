'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { CLAVE_DE_ELIMINAR, PANEL_ETAPAS } from '../../../entities/embudo'
import { CLAVE_DE_EMBUDO, CLAVE_DE_ETAPA } from '../../../entities/tablero'

// «Nuevo embudo» en la URL de la vista (`?panel=nuevo-embudo`).
export const PANEL_NUEVO_EMBUDO = 'nuevo-embudo'

// Lo elegido en la vista de embudo, en la URL: el embudo (va al servidor: cambia el kanban), la etapa
// que se ve en el celular (sólo en la pantalla) y el panel abierto (etapas o nuevo embudo; comparte la
// clave con los demás paneles, así nunca se apilan; abrir suma al historial).
export function useVistaDeEmbudo() {
  const [, setEmbudo] = useQueryState(
    CLAVE_DE_EMBUDO,
    parseAsString.withOptions({ shallow: false }),
  )
  const [etapa, setEtapa] = useQueryState(CLAVE_DE_ETAPA, parseAsString)
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const [, setEliminar] = useQueryState(CLAVE_DE_ELIMINAR, parseAsString)
  return {
    elegirEmbudo: (id: string) => {
      void setEmbudo(id)
      void setEtapa(null)
    },
    etapa,
    elegirEtapa: (id: string) => {
      void setEtapa(id)
    },
    etapasAbierto: panel === PANEL_ETAPAS,
    nuevoAbierto: panel === PANEL_NUEVO_EMBUDO,
    abrirEtapas: () => {
      void setPanel(PANEL_ETAPAS, { history: 'push' })
    },
    abrirNuevo: () => {
      void setPanel(PANEL_NUEVO_EMBUDO, { history: 'push' })
    },
    // Cerrar el panel de etapas también cierra su «Eliminar embudo» (`?eliminar=`).
    cerrarPanel: () => {
      void setPanel(null)
      void setEliminar(null)
    },
  }
}
