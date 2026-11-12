'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_TESTIMONIO,
  PANEL_CONSENTIMIENTO_TESTIMONIO,
} from '../../../../entities/contenido/paneles'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import { useTestimonioDeUrl } from './use-testimonio-de-url'

// El panel de registrar el consentimiento en la URL (`?panel=${PANEL_CONSENTIMIENTO_TESTIMONIO}&testimonio=<id>`): se puede recargar y «atrás» lo cierra.
export function useConsentimientoPorUrl(testimonios: readonly Testimonio[]) {
  return useTestimonioDeUrl(
    usePanelPorUrl(PANEL_CONSENTIMIENTO_TESTIMONIO, [CLAVE_DE_TESTIMONIO]),
    testimonios,
  )
}
