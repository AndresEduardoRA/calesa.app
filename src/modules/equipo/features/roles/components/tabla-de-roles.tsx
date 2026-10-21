'use client'

import type { Permisos } from '@/shared/lib/permisos'
import { CabeceraPegada } from '@/shared/ui/lista'
import { Table, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { rolDominado } from '../../../entities/dominancia'
import type { GrupoDePermisos, OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { EncabezadoRol } from './encabezado-rol'
import { GrupoMatriz, type ColumnaDeRol } from './grupo-matriz'

type Props = {
  grupos: readonly GrupoDePermisos[]
  columnas: readonly ColumnaDeRol[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  puedeGestionar: boolean
  alEliminar: (rolId: string) => void
  alAplicar: (rol: RolConConcesiones, cambio: CambioDeConcesion) => void
}

// La matriz desde 768 px: una columna por rol y un renglón por permiso. La columna «Permiso» va pegada a la izquierda: con muchos roles la
// tabla se desplaza de costado dentro de su tarjeta (4.012 px con ocho roles al 200 %) y el nombre de cada permiso no se pierde (5a-19).
// Por debajo de 768 px, un rol a la vez en `ListaDelRol`.
export function TablaDeRoles(props: Props) {
  const { grupos, columnas, origenes, misPermisos, puedeGestionar } = props
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre" className="min-w-52 align-bottom">
            Permiso
          </CabeceraPegada>
          {columnas.map(({ rol }) => (
            <TableHead key={rol.id} className="align-top">
              <EncabezadoRol
                rol={rol}
                puedeGestionar={puedeGestionar}
                dominado={rolDominado(misPermisos, rol.concesiones)}
                alEliminar={() => {
                  props.alEliminar(rol.id)
                }}
              />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      {grupos.map((grupo) => (
        <GrupoMatriz
          key={grupo.modulo}
          grupo={grupo}
          columnas={columnas}
          origenes={origenes}
          misPermisos={misPermisos}
          alAplicar={props.alAplicar}
        />
      ))}
    </Table>
  )
}
