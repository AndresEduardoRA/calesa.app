'use client'

import { useEffect } from 'react'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  SUPERFICIE_DE_LAS_RECIENTES,
  SUPERFICIE_DEL_RESULTADO,
  motivoParaNoDeshacer,
  type ImportacionReciente,
} from '../../../entities/importacion/deshacer'
import { usePanelDeDeshacer } from './use-panel-de-deshacer'

// «Tus importaciones recientes» revisa, una vez al llegar, el diálogo que nombra la URL (`desde=recientes`): una importación que no
// está, que ya se deshizo o que venció no abre (se avisa y la URL se limpia, escrita a mano también). Un `desde` que no es de
// ninguna superficie tampoco abre.
export function useRevisionDelDeshacer(recientes: readonly ImportacionReciente[], ahora: string) {
  const panel = usePanelDeDeshacer()
  const apertura = useApertura(panel.abierto)
  const delResultado = panel.superficie === SUPERFICIE_DEL_RESULTADO
  const revisa = panel.abierto && !delResultado
  const motivo =
    panel.superficie === SUPERFICIE_DE_LAS_RECIENTES
      ? motivoParaNoDeshacer(recientes, panel.importacion, new Date(ahora))
      : 'No encontramos eso para deshacer.'
  useRevisionAlAbrir(
    revisa ? `${String(apertura)}:${panel.importacion ?? ''}:${panel.superficie ?? ''}` : null,
    revisa ? motivo : null,
    panel.cerrar,
  )
}

// El resultado de una importación vive sólo en la memoria de la pantalla: tras recargar, el diálogo que `desde=resultado` nombraba
// ya no tiene de dónde salir, y la URL se limpia (la importación se deshace desde «Tus importaciones recientes»).
export function useLimpiarDeshacerHuerfano(enResultado: boolean) {
  const panel = usePanelDeDeshacer()
  const huerfano = panel.abierto && panel.superficie === SUPERFICIE_DEL_RESULTADO && !enResultado
  const { cerrar } = panel
  useEffect(() => {
    if (huerfano) {
      cerrar()
    }
  }, [huerfano, cerrar])
}
