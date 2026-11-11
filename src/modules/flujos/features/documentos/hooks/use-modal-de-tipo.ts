'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { ClaveDeGrupo, TipoDeDocumento } from '../../../entities/documentos/tipo-de-documento'
import {
  MOTIVO_DE_TIPO_NO_DISPONIBLE,
  buscarTipo,
  claveDeGrupoDe,
  motivoParaNoAbrirTipo,
  type VistasDeGrupos,
} from '../../../entities/documentos/vista-de-grupo'
import { usePanelDeTipo } from './use-panel-de-tipo'

// El grupo del modal: el de la URL al crear, el del tipo al editar.
function grupoDelModal(
  modo: 'nuevo' | 'editar' | null,
  de: string | null,
  editado: TipoDeDocumento | null,
): ClaveDeGrupo | null {
  if (modo === 'nuevo') {
    return claveDeGrupoDe(de)
  }
  if (editado === null) {
    return null
  }
  return editado.flujoId === null ? 'empresa' : 'flujo'
}

type Panel = ReturnType<typeof usePanelDeTipo>

function modoDelPanel(panel: Panel): 'nuevo' | 'editar' | null {
  if (panel.nuevo) {
    return 'nuevo'
  }
  return panel.hayEdicion ? 'editar' : null
}

// Identifica la apertura (nula = no hay nada que revisar).
function claveDeApertura(apertura: number, modo: string | null, panel: Panel): string | null {
  return modo === null
    ? null
    : [apertura, modo, panel.de ?? '', panel.editando ?? ''].map(String).join(':')
}

// Qué muestra el modal según la URL. «Nuevo tipo» abre sólo con un grupo válido, que se puede cambiar y que no está al tope; «Editar» abre el
// de su `?tipo=<id>` (uno que no está no abre, ni escribiendo la URL a mano): se revisa una vez, al llegar; se avisa y la URL se limpia. Si el que
// se edita desaparece con el modal abierto (otra persona lo eliminó), el modal sigue a la vista y dice por qué ya no se guarda.
export function useModalDeTipo(vistas: VistasDeGrupos) {
  const panel = usePanelDeTipo()
  const modo = modoDelPanel(panel)
  const original = buscarTipo(vistas, panel.editando)?.tipo ?? null
  const apertura = useApertura(modo !== null)
  const rechazada = useRevisionAlAbrir(
    claveDeApertura(apertura, modo, panel),
    motivoParaNoAbrirTipo(vistas, modo, panel.de, panel.editando),
    panel.cerrar,
  )
  const ultimo = useUltimo(modo === 'editar' ? original : null)
  const editado = modo === 'editar' ? (original ?? ultimo) : null
  return {
    modo,
    abierto: modo !== null && !rechazada,
    apertura,
    grupo: grupoDelModal(modo, panel.de, editado),
    // El que se edita: el último que se vio mientras el modal está abierto.
    original: editado,
    noDisponible: editado !== null && original === null ? MOTIVO_DE_TIPO_NO_DISPONIBLE : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirEdicion: panel.abrirEdicion,
  }
}
