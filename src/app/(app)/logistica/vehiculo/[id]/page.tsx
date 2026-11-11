import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { UnidadAbierta } from '../../unidad-abierta'

export const metadata: Metadata = { title: 'Logística' }

// La unidad de logística en su propia página (6.01): a ella apunta la notificación de demora. Es el mismo panel que se abre en el drawer de la cadena (D1).
export default async function PaginaDeLaUnidad({ params }: PageProps<'/logistica/vehiculo/[id]'>) {
  const [sesion, { id }] = await Promise.all([requerirSesion(), params])
  return (
    <div className="max-w-3xl">
      <UnidadAbierta id={id} permisos={sesion.permisos} />
    </div>
  )
}
