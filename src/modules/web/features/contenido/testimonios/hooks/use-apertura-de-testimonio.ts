'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import { MENSAJE_TESTIMONIO_YA_NO_ESTA } from '../../../../entities/contenido/paneles'
import { usePanelDeTestimonio } from './use-panel-de-testimonio'

type Modo = 'nueva' | 'editar' | null

const modoDe = (panel: { nueva: boolean; hayEdicion: boolean }): Modo =>
  panel.nueva ? 'nueva' : panel.hayEdicion ? 'editar' : null

// Qué muestra el panel de testimonios según la URL. «Nuevo» siempre abre; «Editar» abre el testimonio de `?testimonio=` si está en lo leído (uno que no está,
// aunque se escriba la URL a mano, se avisa una vez y la URL se limpia). Si el que se edita desaparece con el panel abierto, sigue a la vista y dice por qué
// ya no se guarda.
export function useAperturaDeTestimonio(testimonios: readonly Testimonio[]) {
  const panel = usePanelDeTestimonio()
  const modo = modoDe(panel)
  const original = testimonios.find((t) => t.id === panel.editando) ?? null
  const apertura = useApertura(modo !== null)
  const sinTestimonio = modo === 'editar' && original === null
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${panel.editando ?? ''}`,
    sinTestimonio ? MENSAJE_TESTIMONIO_YA_NO_ESTA : null,
    panel.cerrar,
  )
  const ultima = useUltimo(modo === 'editar' ? original : null)
  return {
    abierto: modo !== null && !rechazada,
    apertura,
    // Nula = «Nuevo testimonio».
    original: modo === 'editar' ? (original ?? ultima) : null,
    noDisponible: sinTestimonio && ultima !== null ? MENSAJE_TESTIMONIO_YA_NO_ESTA : null,
    alCerrar: panel.cerrar,
    abrirNueva: panel.abrirNueva,
    abrirEdicion: panel.abrirEdicion,
  }
}
