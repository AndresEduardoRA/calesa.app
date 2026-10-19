import type { Metadata } from 'next'
import { agruparPorModulo, leerMatriz, puede, requerirSesion } from '@/modules/equipo'
import { MatrizDeRoles } from '@/modules/equipo/pantallas/roles'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Roles y permisos' }

// La matriz de roles × permisos. Verla pide `equipo.roles.ver`; cambiarla, `equipo.roles.gestionar`
// (y la base lo vuelve a comprobar en cada RPC). Los orígenes los lee esta página y se los pasa a
// la matriz: `equipo` no depende de `origenes`.
export default async function PaginaRoles() {
  const sesion = await requerirSesion()
  const puedeGestionar = puede(sesion.permisos, 'equipo.roles.gestionar')
  if (!puedeGestionar && !puede(sesion.permisos, 'equipo.roles.ver')) {
    return <EstadoSinPermiso />
  }
  // También los desactivados: lo que se les otorgó sigue valiendo y no se esconde.
  const [matriz, origenes] = await Promise.all([leerMatriz(), getOrigenes(true)])
  const { roles, catalogo } = datosO(matriz)
  return (
    <MatrizDeRoles
      roles={roles}
      grupos={agruparPorModulo(catalogo)}
      origenes={datosO(origenes).map(({ id, nombre, activo }) => ({
        id,
        nombre: activo ? nombre : `${nombre} (inactivo)`,
      }))}
      misPermisos={sesion.permisos}
      puedeGestionar={puedeGestionar}
    />
  )
}
