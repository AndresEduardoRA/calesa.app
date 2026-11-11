import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoDetalle } from '@/shared/ui/esqueletos'
import { CLAVE_DE_UNIDAD } from './clave-de-unidad'
import { DrawerDeLaUnidad } from './drawer-de-la-unidad'
import { UnidadAbierta } from './unidad-abierta'

export const metadata: Metadata = { title: 'Logística' }

// `/logistica` (6.01): entra quien tiene `logistica.ver` en algún origen; sin ella, «No tienes permiso». La cadena (el kanban por fase) llega con el 6.03: hasta entonces la
// pantalla sólo dice eso y dibuja, en un drawer por URL (`?vehiculo=<id>`), el panel de la unidad que pida el enlace. Un id que no es válido o que ya no se ve muestra, dentro
// del drawer, el mismo «ya no está disponible» de su propia página.
export default async function PaginaDeLogistica({ searchParams }: PageProps<'/logistica'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'logistica.ver')) {
    return <EstadoSinPermiso />
  }
  const unidad = unParametro(parametros[CLAVE_DE_UNIDAD])
  return (
    <>
      <EstadoVacio compacto titulo="La cadena llega con el próximo paso." />
      {unidad ? (
        <DrawerDeLaUnidad>
          <Suspense key={unidad} fallback={<EsqueletoDetalle />}>
            <UnidadAbierta id={unidad} permisos={sesion.permisos} />
          </Suspense>
        </DrawerDeLaUnidad>
      ) : null}
    </>
  )
}
