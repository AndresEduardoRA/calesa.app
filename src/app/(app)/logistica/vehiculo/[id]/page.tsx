import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { UnidadAbierta } from '../../unidad-abierta'

export const metadata: Metadata = { title: 'Unidad de logística' }

// La unidad de logística en su propia página (6.01): a ella apunta la notificación de demora. Es el mismo panel que se abre en el drawer de la cadena (D1).
export default async function PaginaDeLaUnidad({ params }: PageProps<'/logistica/vehiculo/[id]'>) {
  const [sesion, { id }] = await Promise.all([requerirSesion(), params])
  return (
    <div className="max-w-3xl">
      {/* Sin cabecera visible: el panel de la unidad abre con su propia tarjeta (9.12-5, R3). */}
      <h1 className="sr-only">Unidad de logística</h1>
      <UnidadAbierta id={id} permisos={sesion.permisos} />
    </div>
  )
}
