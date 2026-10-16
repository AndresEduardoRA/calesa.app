'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  MENSAJE_DE_RECORDATORIO_COMPLETADO,
  MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE,
  recordatorioParaEditar,
  type Recordatorio,
  type RecordatorioParaEditar,
} from '../../../entities/recordatorios'
import { usePanelDeRecordatorio } from './use-panel-de-recordatorio'

type Args = {
  lista: readonly Recordatorio[]
  puedeAgendar: boolean
}

// Por qué no se puede editar el de la URL (nulo si se puede, o si no se está editando).
function motivoDe(objetivo: RecordatorioParaEditar | null): string | null {
  if (objetivo === null || objetivo.tipo === 'editable') {
    return null
  }
  return objetivo.tipo === 'completado'
    ? MENSAJE_DE_RECORDATORIO_COMPLETADO
    : MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE
}

// El que se puede mostrar (también uno completado, para decir por qué ya no se guarda).
function recordatorioDe(objetivo: RecordatorioParaEditar | null): Recordatorio | null {
  return objetivo === null || objetivo.tipo === 'no_esta' ? null : objetivo.recordatorio
}

function modoDe(agendando: boolean, editando: string | null): 'agendar' | 'editar' | null {
  if (agendando) {
    return 'agendar'
  }
  return editando === null ? null : 'editar'
}

// Qué muestra el modal de recordatorios según la URL. Agendar sólo con `puedeAgendar`. Editar abre el
// de `?recordatorio=<id>` entre los de quien mira (ajeno, eliminado o inventado «no está»).
export function useModalDeRecordatorio({ lista, puedeAgendar }: Args) {
  const panel = usePanelDeRecordatorio()
  const editando = panel.editando
  const objetivo = editando === null ? null : recordatorioParaEditar(lista, editando)
  const enLaUrl = panel.agendando || editando !== null
  const apertura = useApertura(enLaUrl)
  const motivo = motivoDe(objetivo)
  const rechazada = useRevisionAlAbrir(
    editando === null ? null : `${String(apertura)}:${editando}`,
    motivo,
    panel.cerrar,
  )
  const abierto = panel.agendando ? puedeAgendar : editando !== null && !rechazada
  // Mientras se cierra (la URL ya no lo nombra) y si deja de estar, el último que se vio: el título y
  // los campos no cambian a «Agendar» en la animación.
  const ultimo = useUltimo(recordatorioDe(objetivo))
  const modo = useUltimo(modoDe(panel.agendando, editando))
  const original = modo === 'editar' ? ultimo : null
  // Pasar de editar uno a editar otro (o a agendar) sin cerrar —con el historial o la URL— también es
  // una apertura nueva: no se mezcla lo escrito ni el borrador de uno con el otro.
  const destino = useUltimo(panel.agendando ? 'agendar' : editando)
  const editandoAbierto = abierto && editando !== null

  return {
    abierto,
    // La `key` del modal: cada apertura y cada recordatorio empiezan de cero.
    llave: `${String(apertura)}:${destino ?? ''}`,
    original,
    noDisponible: editandoAbierto ? motivo : null,
    abrirAgendar: panel.abrirAgendar,
    abrirEdicion: panel.abrirEdicion,
    cerrar: panel.cerrar,
    // El «Editar» del que se estaba editando, si sigue en la lista.
    focoAlCerrar: (): HTMLElement | null =>
      original
        ? document.querySelector<HTMLElement>(`[data-recordatorio-editar="${original.id}"]`)
        : null,
  }
}
