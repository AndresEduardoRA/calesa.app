'use client'

import type { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_TESTIMONIO,
  MENSAJE_TESTIMONIO_YA_NO_ESTA,
} from '../../../../entities/contenido/paneles'
import type { Testimonio } from '../../../../entities/contenido/testimonios'

// Lo común de los tres paneles de «un testimonio por id» (consentimiento, retiro y eliminar; `?panel=<uno>&testimonio=<id>`): quien lo llama trae su `url`
// (`usePanelPorUrl(<su panel>, [CLAVE_DE_TESTIMONIO])`). Un testimonio que ya no está no abre (se avisa y la URL se limpia, una vez); mientras se va, el
// panel conserva el último que vio.
export function useTestimonioDeUrl(
  url: ReturnType<typeof usePanelPorUrl>,
  testimonios: readonly Testimonio[],
) {
  const id = url.valor(CLAVE_DE_TESTIMONIO)
  const apertura = useApertura(url.abierto)
  const encontrado = testimonios.find((t) => t.id === id) ?? null
  const rechazado = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && encontrado === null ? MENSAJE_TESTIMONIO_YA_NO_ESTA : null,
    url.cerrar,
  )
  const testimonio = useUltimo(url.abierto && !rechazado ? encontrado : null)
  return {
    abierto: url.abierto && !rechazado && encontrado !== null,
    apertura,
    testimonio,
    abrir: (testimonioId: string) => {
      url.abrir({ [CLAVE_DE_TESTIMONIO]: testimonioId })
    },
    cerrar: url.cerrar,
  }
}
