'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { PANEL_NUEVA_FASE, motivoParaNoAbrirNuevaFase } from '../../../entities/fases/panel-de-fase'
import type { FlujoParaConfigurar } from '../../../entities/flujo'

// El modal de «Nueva fase», en la URL (`?panel=nueva-fase`): se puede recargar y «atrás» lo cierra. Con el flujo al tope no abre (se avisa y la URL se
// limpia, escrita a mano también); se revisa una vez, al llegar.
export function useModalDeNuevaFase(flujo: Pick<FlujoParaConfigurar, 'fases'>) {
  const url = usePanelPorUrl(PANEL_NUEVA_FASE)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? String(apertura) : null,
    url.abierto ? motivoParaNoAbrirNuevaFase(flujo) : null,
    url.cerrar,
  )
  return {
    abierto: url.abierto && !rechazada,
    apertura,
    alCerrar: url.cerrar,
    abrir: () => {
      url.abrir()
    },
  }
}
