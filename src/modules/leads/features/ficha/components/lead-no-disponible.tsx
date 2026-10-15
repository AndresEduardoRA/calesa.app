import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'

// Un lead que no existe, uno en la papelera, uno sin dueño y uno al que no se tiene acceso se ven
// igual: decir «no tienes permiso» confirmaría que existe.
export function LeadNoDisponible() {
  return (
    <EstadoVacio
      titulo={MENSAJE_DE_LEAD_NO_DISPONIBLE}
      descripcion="Vuelve al listado para buscarlo."
      accion={
        <Link href={RUTAS.leads as Route} className={buttonVariants({ variant: 'outline' })}>
          Ir a Leads
        </Link>
      }
    />
  )
}
