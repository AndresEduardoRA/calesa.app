'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_AGREGAR,
  CLAVE_DE_LA_FORMA,
  formaDeAgregarDe,
  PANEL_AGREGAR,
  type FormaDeAgregar,
} from '../../../entities/requisitos/vista-de-fase'

// «Agregar requisito» en la URL (`?agregar=nuevo&forma=elegir|dato|documento|espera`): se puede recargar y «atrás» vuelve al selector o lo cierra. `forma` es nula
// con el bloque cerrado; una forma que no se conoce cae en el selector.
export function useAgregarRequisito() {
  const url = usePanelPorUrl(PANEL_AGREGAR, [CLAVE_DE_LA_FORMA], { clave: CLAVE_AGREGAR })
  const forma: FormaDeAgregar | null = url.abierto
    ? formaDeAgregarDe(url.valor(CLAVE_DE_LA_FORMA))
    : null
  return {
    forma,
    abrir: (cual: FormaDeAgregar) => {
      url.abrir({ [CLAVE_DE_LA_FORMA]: cual })
    },
    cerrar: url.cerrar,
  }
}
