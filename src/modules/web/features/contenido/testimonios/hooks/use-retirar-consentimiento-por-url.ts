'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_TESTIMONIO,
  PANEL_RETIRAR_CONSENTIMIENTO,
} from '../../../../entities/contenido/paneles'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import { useTestimonioDeUrl } from './use-testimonio-de-url'

// La confirmación de retirar el consentimiento en la URL (`?panel=${PANEL_RETIRAR_CONSENTIMIENTO}&testimonio=<id>`): se puede recargar y «atrás» lo cierra.
export function useRetirarConsentimientoPorUrl(testimonios: readonly Testimonio[]) {
  return useTestimonioDeUrl(
    usePanelPorUrl(PANEL_RETIRAR_CONSENTIMIENTO, [CLAVE_DE_TESTIMONIO]),
    testimonios,
  )
}
