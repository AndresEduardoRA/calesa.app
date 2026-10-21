import { Bloque } from '@/shared/ui/bloque'
import type { Permisos } from '@/shared/lib/permisos'
import { textoDeLaRueda } from '../../../entities/rueda'

// «Turnos de la web» en Mi perfil: sólo dice si el rol de la persona recibe turnos. Los permisos que recibe son los efectivos (con «Ver como» activo,
// los del rol que se mira). El interruptor de disponibilidad llega con la Fase 8 y nace acá, deshabilitado con este mismo motivo si el rol no recibe.
export function EstadoEnLaRueda({ permisos }: { permisos: Permisos }) {
  return (
    <Bloque titulo="Turnos de la web">
      <p className="text-(length:--text-sm) text-(--color-ink)">{textoDeLaRueda(permisos)}</p>
    </Bloque>
  )
}
