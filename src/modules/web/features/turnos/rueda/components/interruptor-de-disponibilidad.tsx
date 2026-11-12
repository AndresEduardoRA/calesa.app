'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import { AYUDA_DE_DISPONIBILIDAD } from '../../../../entities/turnos/rueda'
import { useDisponibilidad } from '../hooks/use-disponibilidad'

// «Disponible para recibir turnos»: con `motivo` (no recibe turnos, no la sumaron a la rueda o mira otro rol) queda apagado y deshabilitado diciendo por qué.
export function InterruptorDeDisponibilidad({
  disponible,
  motivo,
}: {
  disponible: boolean
  motivo: string | null
}) {
  const { valor, error, enCurso, cambiar } = useDisponibilidad(disponible)
  return (
    <div className="grid gap-1.5">
      <Interruptor
        titulo="Disponible para recibir turnos"
        ayuda={motivo ?? AYUDA_DE_DISPONIBILIDAD}
        valor={motivo === null ? valor : false}
        alCambiar={(nuevo) => void cambiar(nuevo)}
        deshabilitado={motivo !== null || enCurso}
      />
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}
