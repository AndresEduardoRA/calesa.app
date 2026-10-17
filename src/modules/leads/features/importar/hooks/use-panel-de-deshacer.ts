'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_IMPORTACION,
  CLAVE_DE_SUPERFICIE,
  PANEL_DESHACER_IMPORTACION,
} from '../../../entities/importacion/deshacer'

// El diálogo de «Deshacer importación» en la URL (`?panel=deshacer-importacion&importacion=<id>&desde=<superficie>`). Cada
// «Deshacer» sabe si es el suyo por la importación y por dónde se pidió (el resultado del asistente o las recientes). Abrir
// suma al historial («atrás» lo cierra).
export function usePanelDeDeshacer() {
  const panel = usePanelPorUrl(PANEL_DESHACER_IMPORTACION, [
    CLAVE_DE_IMPORTACION,
    CLAVE_DE_SUPERFICIE,
  ])
  return {
    abierto: panel.abierto,
    importacion: panel.valor(CLAVE_DE_IMPORTACION),
    superficie: panel.valor(CLAVE_DE_SUPERFICIE),
    abrir: (importacionId: string, superficie: string) => {
      panel.abrir({ [CLAVE_DE_IMPORTACION]: importacionId, [CLAVE_DE_SUPERFICIE]: superficie })
    },
    cerrar: panel.cerrar,
  }
}
