'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import { sePuedeMover } from '../../../entities/estado-del-push'
import type { usePush } from '../hooks/use-push'

type Props = { push: ReturnType<typeof usePush> }

const AYUDA_POR_OMISION = 'Recibe en este navegador los avisos que ves en la campana.'

// «Recibir avisos en este navegador». Un estado que no deja mover el interruptor lo deja a la vista, deshabilitado y con su
// motivo escrito al lado: nunca escondido.
export function InterruptorDePush({ push }: Props) {
  const { lectura, revisando, motivoDeRevision, encendido, enCurso, cambiar } = push
  const ayuda = revisando
    ? motivoDeRevision
    : lectura.motivo === null
      ? AYUDA_POR_OMISION
      : [lectura.motivo, lectura.ayuda].filter(Boolean).join(' ')
  return (
    <Interruptor
      titulo="Recibir avisos en este navegador"
      ayuda={ayuda}
      valor={encendido}
      alCambiar={(valor) => void cambiar(valor)}
      deshabilitado={revisando || enCurso || !sePuedeMover(lectura.estado)}
    />
  )
}
