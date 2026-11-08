'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_TONO,
  MOTIVO_DE_TONO_NO_DISPONIBLE,
  PANEL_EDITAR_TONO,
  PANEL_NUEVO_TONO,
  motivoParaNoAbrirTono,
  tonoPorId,
} from '../../../entities/diseno/panel-de-tonos'
import type { ListaDeTonos } from '../../../entities/diseno/tonos'

const modoDe = (nuevo: boolean, editar: boolean) => (nuevo ? 'nuevo' : editar ? 'editar' : null)

// Qué muestra el modal de tonos según la URL: `?panel=nuevo-tono` o `?panel=editar-tono&tono=<id>`. «Nuevo» no abre con el tope lleno y «Editar» no abre un tono que
// no está (ni escribiendo la URL a mano): se revisa una vez, al llegar; se avisa y la URL se limpia. Si el que se edita desaparece con el modal abierto (otra
// persona lo eliminó), el modal sigue a la vista y dice por qué ya no se guarda.
export function useModalDeTono(lista: ListaDeTonos) {
  const nuevo = usePanelPorUrl(PANEL_NUEVO_TONO)
  const editar = usePanelPorUrl(PANEL_EDITAR_TONO, [CLAVE_DE_TONO])
  const modo = modoDe(nuevo.abierto, editar.abierto)
  const id = editar.valor(CLAVE_DE_TONO)
  const original = modo === 'editar' ? tonoPorId(lista.tonos, id) : null
  const apertura = useApertura(modo !== null)
  const cerrar = modo === 'editar' ? editar.cerrar : nuevo.cerrar
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}:${id ?? ''}`,
    motivoParaNoAbrirTono(lista, modo, id),
    cerrar,
  )
  const ultimo = useUltimo(original)
  const seFue = modo === 'editar' && original === null && ultimo !== null
  return {
    modo,
    abierto: modo !== null && !rechazada,
    apertura,
    // El que se edita: el último que se vio mientras el modal está abierto.
    original: modo === 'editar' ? (original ?? ultimo) : null,
    noDisponible: seFue ? MOTIVO_DE_TONO_NO_DISPONIBLE : null,
    alCerrar: cerrar,
    abrirNuevo: () => {
      nuevo.abrir()
    },
    abrirEdicion: (tonoId: string) => {
      editar.abrir({ [CLAVE_DE_TONO]: tonoId })
    },
  }
}
