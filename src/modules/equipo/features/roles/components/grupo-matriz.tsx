'use client'

import type { Permisos } from '@/shared/lib/permisos'
import { CabeceraPegada } from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableRow } from '@/shared/ui/table'
import {
  concesionesDelPermiso,
  type GrupoDePermisos,
  type OrigenDeLaMatriz,
} from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { CeldaConcesion } from './celda-concesion'

// Lo que la tabla sabe de cada columna, ya resuelto una vez para todas sus celdas.
export type ColumnaDeRol = {
  rol: RolConConcesiones
  // La persona gestiona roles y domina este.
  editable: boolean
  ocupado: boolean
}

type Props = {
  grupo: GrupoDePermisos
  columnas: readonly ColumnaDeRol[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  alAplicar: (rol: RolConConcesiones, cambio: CambioDeConcesion) => void
}

// Los permisos de un módulo: su título y un renglón por permiso, con una celda por rol.
export function GrupoMatriz({ grupo, columnas, origenes, misPermisos, alAplicar }: Props) {
  return (
    <TableBody>
      <TableRow className="bg-(--color-paper-dim) hover:bg-(--color-paper-dim)">
        <TableHead
          scope="colgroup"
          colSpan={columnas.length + 1}
          className="h-8 text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft)"
        >
          {/* El título del módulo abarca todas las columnas: él solo se queda a la vista mientras la tabla se desplaza. */}
          <span className="sticky left-3 inline-block">{grupo.titulo}</span>
        </TableHead>
      </TableRow>
      {grupo.permisos.map((permiso) => (
        <TableRow key={permiso.clave} data-permiso={permiso.clave}>
          <CabeceraPegada
            lado="nombre"
            scope="row"
            className="min-w-52 py-2 font-normal whitespace-normal"
          >
            <span
              data-nombre-de-permiso
              className="block text-(length:--text-sm) text-(--color-ink)"
            >
              {permiso.nombre}
            </span>
            <span className="block text-(length:--text-xs) text-(--color-ink-faint)">
              {permiso.descripcion}
            </span>
          </CabeceraPegada>
          {columnas.map(({ rol, editable, ocupado }) => (
            <TableCell key={rol.id}>
              <CeldaConcesion
                permiso={permiso}
                rolNombre={rol.nombre}
                delPermiso={concesionesDelPermiso(rol.concesiones, permiso.clave)}
                origenes={origenes}
                misPermisos={misPermisos}
                editable={editable}
                ocupado={ocupado}
                alAplicar={(cambio) => {
                  alAplicar(rol, cambio)
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}
