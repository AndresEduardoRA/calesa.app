import { Bloque } from '@/shared/ui/bloque'
import type { Permisos } from '@/shared/lib/permisos'
import {
  TEXTO_SIN_RUEDA,
  motivoSinInterruptor,
  textoDeLaRueda,
} from '../../../../entities/turnos/rueda'
import { InterruptorDeDisponibilidad } from './interruptor-de-disponibilidad'

// «Turnos de la web» en Mi perfil: dice si el rol de la persona recibe turnos y, con el interruptor, si ahora quiere recibirlos. Los permisos son los efectivos (con
// «Ver como» activo, los del rol que se mira); en ese caso el interruptor se apaga, porque escribiría en la cuenta real y no en la que se mira (D12 del 8.05-2).
export function EstadoEnLaRueda({
  permisos,
  habilitado,
  disponible,
  miraOtroRol,
}: {
  permisos: Permisos
  habilitado: boolean
  disponible: boolean
  miraOtroRol: boolean
}) {
  const motivo = motivoSinInterruptor({ permisos, habilitado, miraOtroRol })
  return (
    <Bloque titulo="Turnos de la web">
      {/* Si el motivo del interruptor ya es esta frase, no se repite. */}
      {motivo === TEXTO_SIN_RUEDA ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink)">{textoDeLaRueda(permisos)}</p>
      )}
      <InterruptorDeDisponibilidad disponible={disponible} motivo={motivo} />
    </Bloque>
  )
}
