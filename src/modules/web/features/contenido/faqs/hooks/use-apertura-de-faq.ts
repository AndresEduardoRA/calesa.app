'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Faq } from '../../../../entities/contenido/faqs'
import { MENSAJE_FAQ_YA_NO_ESTA } from '../../../../entities/contenido/paneles'
import { usePanelDeFaq } from './use-panel-de-faq'

type Modo = 'nueva' | 'editar' | null

const modoDe = (panel: { nueva: boolean; hayEdicion: boolean }): Modo =>
  panel.nueva ? 'nueva' : panel.hayEdicion ? 'editar' : null

// Qué muestra el panel de preguntas según la URL. «Nueva» siempre abre; «Editar» abre la pregunta de `?faq=` si está en lo leído (una que no está, aunque se
// escriba la URL a mano, se avisa una vez y la URL se limpia). Si la que se edita desaparece con el panel abierto, sigue a la vista y dice por qué ya no se guarda.
export function useAperturaDeFaq(faqs: readonly Faq[]) {
  const panel = usePanelDeFaq()
  const modo = modoDe(panel)
  const original = faqs.find((f) => f.id === panel.editando) ?? null
  const apertura = useApertura(modo !== null)
  const sinFaq = modo === 'editar' && original === null
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${panel.editando ?? ''}`,
    sinFaq ? MENSAJE_FAQ_YA_NO_ESTA : null,
    panel.cerrar,
  )
  const ultima = useUltimo(modo === 'editar' ? original : null)
  return {
    abierto: modo !== null && !rechazada,
    apertura,
    // Nula = «Nueva pregunta».
    original: modo === 'editar' ? (original ?? ultima) : null,
    noDisponible: sinFaq && ultima !== null ? MENSAJE_FAQ_YA_NO_ESTA : null,
    alCerrar: panel.cerrar,
    abrirNueva: panel.abrirNueva,
    abrirEdicion: panel.abrirEdicion,
  }
}
