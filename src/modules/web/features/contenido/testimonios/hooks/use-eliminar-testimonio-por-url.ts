'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_TESTIMONIO,
  PANEL_ELIMINAR_TESTIMONIO,
} from '../../../../entities/contenido/paneles'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import { useTestimonioDeUrl } from './use-testimonio-de-url'

// La confirmación de eliminar un testimonio en la URL (`?panel=${PANEL_ELIMINAR_TESTIMONIO}&testimonio=<id>`): se puede recargar y «atrás» lo cierra.
export function useEliminarTestimonioPorUrl(testimonios: readonly Testimonio[]) {
  return useTestimonioDeUrl(
    usePanelPorUrl(PANEL_ELIMINAR_TESTIMONIO, [CLAVE_DE_TESTIMONIO]),
    testimonios,
  )
}
