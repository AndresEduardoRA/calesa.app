import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { PestanasDeCotizacion } from './pestanas-de-cotizacion'
import { SeccionNiveles } from './seccion-niveles'

export const metadata: Metadata = { title: 'Cotización' }

// Configuración › Cotización. Hoy los niveles de acceso de la hoja; los ve quien lee los roles (`equipo.roles.ver`) y los cambia quien los
// gestiona (`equipo.roles.gestionar`): cada nivel es un permiso de la matriz de Roles, y la base vuelve a exigir el permiso en cada RPC.
// Sin ninguno de los dos, la misma pantalla «No tienes permiso» (y la sección no figura en Configuración).
export default async function PaginaDeCotizacion() {
  const sesion = await requerirSesion()
  const puedeGestionar = puede(sesion.permisos, 'equipo.roles.gestionar')
  if (!puedeGestionar && !puede(sesion.permisos, 'equipo.roles.ver')) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Cotización</h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Lo que se configura de la hoja con la que se cotiza.
        </p>
      </div>
      <PestanasDeCotizacion />
      <SeccionNiveles puedeGestionar={puedeGestionar} />
    </div>
  )
}
