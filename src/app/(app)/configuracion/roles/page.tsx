import type { Metadata } from 'next'
import {
  MatrizDeRoles,
  agruparPorModulo,
  leerMatriz,
  puede,
  requerirSesion,
} from '@/modules/equipo'
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
  const [matriz, origenes] = await Promise.all([leerMatriz(), getOrigenes()])
  const { roles, catalogo } = datosO(matriz)
  return (
    <MatrizDeRoles
      roles={roles}
      grupos={agruparPorModulo(catalogo)}
      origenes={datosO(origenes).map(({ id, nombre }) => ({ id, nombre }))}
      misPermisos={sesion.permisos}
      puedeGestionar={puedeGestionar}
    />
  )
}
