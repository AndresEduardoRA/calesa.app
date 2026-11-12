'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { usePanelesDeFicha } from '../hooks/use-paneles-de-ficha'
import { PanelDeEventoDiferido, PanelDeTareaDiferido } from './diferidos'
import type { PropsDePanelDeFicha } from './props-de-panel'

type Props = Pick<PropsDePanelDeFicha, 'conversacion' | 'usuarioId' | 'zona'> & {
  paneles: ReturnType<typeof usePanelesDeFicha>
  puedeAsignar: boolean
  puedePublicar: boolean
  // Tras crear: relee el hilo para ver la ficha y devuelve el foco al campo.
  alCrear: () => void
}

// Los formularios de `/tarea` y `/evento`: se montan la primera vez que se abren y su código viaja diferido. Cerrar uno no toca la conversación.
export function PanelesDeFicha({
  conversacion,
  usuarioId,
  zona,
  paneles,
  puedeAsignar,
  puedePublicar,
  alCrear,
}: Props) {
  const montarTarea = useAbiertoAlgunaVez(paneles.tarea.abierto)
  const montarEvento = useAbiertoAlgunaVez(paneles.evento.abierto)
  const comunes = { conversacion, usuarioId, zona, titulo: paneles.titulo }
  return (
    <>
      {montarTarea ? (
        <PanelDeTareaDiferido
          key={`tarea-${String(paneles.aperturas)}`}
          {...comunes}
          abierto={paneles.tarea.abierto}
          alCerrar={paneles.tarea.cerrar}
          puedeAsignar={puedeAsignar}
          alCrear={() => {
            paneles.tarea.cerrar()
            alCrear()
          }}
        />
      ) : null}
      {montarEvento ? (
        <PanelDeEventoDiferido
          key={`evento-${String(paneles.aperturas)}`}
          {...comunes}
          abierto={paneles.evento.abierto}
          alCerrar={paneles.evento.cerrar}
          puedePublicar={puedePublicar}
          alCrear={() => {
            paneles.evento.cerrar()
            alCrear()
          }}
        />
      ) : null}
    </>
  )
}
