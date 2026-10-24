'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  MOTIVO_DE_NIVEL_NO_DISPONIBLE,
  motivoParaNoAbrirNivel,
  nivelPorId,
  type ListaDeNiveles,
} from '../../../entities/nivel'
import { usePanelDeNivel } from './use-panel-de-nivel'

// Qué muestra el modal de niveles según la URL. «Nuevo nivel» no abre en el tope y «Renombrar» abre el de su `?nivel=<id>` (uno que no está no
// abre, ni escribiendo la URL a mano): se revisa una vez, al llegar; se avisa y la URL se limpia. Si el que se renombra desaparece con el modal
// abierto (otra persona lo eliminó), el modal sigue a la vista y dice por qué ya no se guarda.
export function useModalDeNivel(lista: ListaDeNiveles, puedeGestionar: boolean) {
  const panel = usePanelDeNivel()
  const modo = panel.nuevo ? 'nuevo' : panel.hayRenombre ? 'renombrar' : null
  const original = nivelPorId(lista.niveles, panel.renombrando)
  const apertura = useApertura(modo !== null)

  const motivo = motivoParaNoAbrirNivel(lista, modo, panel.renombrando, puedeGestionar)
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${panel.renombrando ?? ''}`,
    motivo,
    panel.cerrar,
  )

  const ultimo = useUltimo(modo === 'renombrar' ? original : null)
  return {
    modo,
    abierto: modo !== null && !rechazada,
    apertura,
    // El que se renombra: el último que se vio mientras el modal está abierto.
    original: modo === 'renombrar' ? (original ?? ultimo) : null,
    noDisponible:
      modo === 'renombrar' && original === null && ultimo !== null
        ? MOTIVO_DE_NIVEL_NO_DISPONIBLE
        : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirRenombre: panel.abrirRenombre,
  }
}
