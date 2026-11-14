import { badgeVariants } from '@/shared/ui/badge'
import { ETIQUETA_DE_APROBADA } from '../../../entities/historial-del-vehiculo'

// La insignia «Aprobada» de la guardada: un `<span>` con las clases de `<Badge>` (sin el primitivo de Base UI: el JS en frío de `/cotizaciones/[id]` está al tope).
// Puro: lo dibujan el servidor y la isla del botón.
export function InsigniaAprobada() {
  return (
    <span
      className={badgeVariants({ variant: 'secondary' })}
      data-insignia-de-la-guardada=""
      data-aprobada=""
    >
      {ETIQUETA_DE_APROBADA}
    </span>
  )
}
