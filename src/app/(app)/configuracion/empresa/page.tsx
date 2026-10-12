import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { SeccionEmpresa } from './seccion-empresa'

export const metadata: Metadata = { title: 'Empresa' }

// Configuración › Empresa. Entra quien tiene alguno de los dos permisos de la empresa; cada
// parte se edita con el suyo y, sin él, se ve deshabilitada con el motivo.
export default async function PaginaEmpresa() {
  const sesion = await requerirSesion()
  const puedeAjustes = puede(sesion.permisos, 'empresa.ajustes.gestionar')
  const puedeTiposCambio = puede(sesion.permisos, 'empresa.tipos_cambio.gestionar')
  if (!puedeAjustes && !puedeTiposCambio) {
    return <EstadoSinPermiso />
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Empresa</h1>
      <SeccionEmpresa puedeEditar={puedeAjustes} />
    </div>
  )
}
