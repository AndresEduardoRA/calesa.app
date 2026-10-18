'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { motivoParaNoAbrir, tipoPorId, type ListaDeTipos } from '../../../entities/tipo-de-lead'
import { usePanelDeTipo } from './use-panel-de-tipo'

export const MENSAJE_DE_TIPO_NO_DISPONIBLE = 'Ese tipo ya no existe.'

// Qué muestra el modal de tipos según la URL. «Nuevo tipo» no abre en el tope y «Editar» abre el de `?tipo=<id>` (uno que no
// está no abre, ni escribiendo la URL a mano): se revisa una vez, al llegar; se avisa y la URL se limpia. Si el que se edita
// desaparece con el modal abierto (otra persona lo eliminó), el modal sigue a la vista y dice por qué ya no se guarda.
export function useModalDeTipo(lista: ListaDeTipos) {
  const panel = usePanelDeTipo()
  const modo = panel.nuevo ? 'nuevo' : panel.hayEdicion ? 'editar' : null
  const original = tipoPorId(lista.tipos, panel.editando)
  const apertura = useApertura(modo !== null)

  const motivo = motivoParaNoAbrir(lista, modo, panel.editando)
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${panel.editando ?? ''}`,
    motivo,
    panel.cerrar,
  )

  const ultimo = useUltimo(modo === 'editar' ? original : null)
  return {
    modo,
    abierto: modo !== null && !rechazada,
    apertura,
    // El que se edita: el último que se vio mientras el modal está abierto.
    original: modo === 'editar' ? (original ?? ultimo) : null,
    noDisponible:
      modo === 'editar' && original === null && ultimo !== null
        ? MENSAJE_DE_TIPO_NO_DISPONIBLE
        : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirEdicion: panel.abrirEdicion,
  }
}
