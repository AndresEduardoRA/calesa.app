'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Faq } from '../../../../entities/contenido/faqs'
import {
  CLAVE_DE_FAQ,
  MENSAJE_FAQ_YA_NO_ESTA,
  PANEL_ELIMINAR_FAQ,
} from '../../../../entities/contenido/paneles'

// La confirmación de eliminar una pregunta en la URL (`?panel=eliminar-faq&faq=<id>`): se puede recargar y «atrás» la cierra. Una que ya no está no abre (se
// avisa y la URL se limpia, una vez); mientras se va, el diálogo conserva la última que vio.
export function useEliminarFaqPorUrl(faqs: readonly Faq[]) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_FAQ, [CLAVE_DE_FAQ])
  const id = url.valor(CLAVE_DE_FAQ)
  const apertura = useApertura(url.abierto)
  const encontrada = faqs.find((f) => f.id === id) ?? null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && encontrada === null ? MENSAJE_FAQ_YA_NO_ESTA : null,
    url.cerrar,
  )
  const faq = useUltimo(url.abierto && !rechazada ? encontrada : null)
  return {
    abierto: url.abierto && !rechazada && encontrada !== null,
    faq,
    abrir: (faqId: string) => {
      url.abrir({ [CLAVE_DE_FAQ]: faqId })
    },
    cerrar: url.cerrar,
  }
}
