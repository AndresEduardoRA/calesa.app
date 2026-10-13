import { ArrowLeftIcon } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { z } from 'zod'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { leerVehiculo, origenesVisibles } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { SeccionFicha } from './seccion-ficha'

export const metadata: Metadata = { title: 'Vehículo' }

// Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual: decir
// «no tienes permiso» confirmaría que existe.
function NoDisponible() {
  return (
    <EstadoVacio
      titulo="No existe o no tienes acceso"
      descripcion="Puede que se haya eliminado, o que esté en un origen que no ves."
      accion={
        <Link href={RUTAS.vehiculos as Route} className={buttonVariants({ variant: 'outline' })}>
          Ir al inventario
        </Link>
      }
    />
  )
}

// La ficha de un vehículo. Hoy tiene una sola pestaña (ver `pestanas.ts`); las demás se suman
// con su sección cuando existan.
export default async function PaginaVehiculo({ params }: PageProps<'/vehiculos/[id]'>) {
  const [sesion, { id }] = await Promise.all([requerirSesion(), params])
  if (!z.guid().safeParse(id).success) {
    return <NoDisponible />
  }
  const [vehiculo, origenes] = await Promise.all([leerVehiculo(id), getOrigenes(true)])
  const encontrado = datosO(vehiculo)
  const origen = origenesVisibles(sesion.permisos, datosO(origenes)).find(
    (uno) => uno.id === encontrado?.origenId,
  )
  if (!encontrado || !origen) {
    return <NoDisponible />
  }
  return (
    <div className="grid max-w-4xl gap-4">
      <Link
        href={`${RUTAS.vehiculos}?origen=${origen.id}` as Route}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {origen.nombre}
      </Link>
      <SeccionFicha vehiculo={encontrado} origen={origen} />
    </div>
  )
}
