'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { Table, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { rolDominado } from '../../../entities/dominancia'
import type { GrupoDePermisos, OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import { useMatriz } from '../hooks/use-matriz'
import { CabeceraMatriz } from './cabecera-matriz'
import { EliminarRol } from './eliminar-rol'
import { EncabezadoRol } from './encabezado-rol'
import { GrupoMatriz, type ColumnaDeRol } from './grupo-matriz'
import { NuevoRol } from './nuevo-rol'
import { SelectorDeRol } from './selector-de-rol'

type Props = {
  roles: RolConConcesiones[]
  // El catálogo de permisos, ya agrupado por módulo.
  grupos: GrupoDePermisos[]
  origenes: OrigenDeLaMatriz[]
  // Con qué se dibuja la dominancia: lo que la persona no tiene, no lo puede dar.
  misPermisos: Permisos
  puedeGestionar: boolean
}

// En móvil se ve un rol a la vez; el resto de las columnas aparece desde el ancho de tableta.
const SOLO_EN_ANCHO = 'hidden md:table-cell'

// Roles × permisos. Cada celda guarda sola; el panel abierto y el rol a la vista viven en la URL.
export function MatrizDeRoles({ roles, grupos, origenes, misPermisos, puedeGestionar }: Props) {
  const [{ rol: rolElegido, panel, eliminar }, setParametros] = useQueryStates(
    { rol: parseAsString, panel: parseAsString, eliminar: parseAsString },
    { shallow: false },
  )
  const { aplicar, rolEnCurso } = useMatriz()
  const aLaVista = roles.find((rol) => rol.id === rolElegido) ?? roles[0]

  if (grupos.length === 0 || !aLaVista) {
    return (
      <EstadoVacio
        titulo="Todavía no hay permisos que repartir"
        descripcion="El catálogo de permisos se carga al instalar el sistema. Avisa a quien lo administra."
      />
    )
  }

  const columnas: ColumnaDeRol[] = roles.map((rol) => ({
    rol,
    editable: puedeGestionar && rolDominado(misPermisos, rol.concesiones),
    ocupado: rolEnCurso === rol.id,
    className: rol.id === aLaVista.id ? undefined : SOLO_EN_ANCHO,
  }))

  return (
    <div className="grid gap-4">
      <CabeceraMatriz
        puedeGestionar={puedeGestionar}
        alCrearRol={() => void setParametros({ panel: 'nuevo-rol' })}
      />
      <SelectorDeRol
        roles={roles}
        valor={aLaVista.id}
        alCambiar={(rol) => void setParametros({ rol })}
      />
      <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-52 align-bottom">Permiso</TableHead>
              {columnas.map(({ rol, className }) => (
                <TableHead key={rol.id} className={`align-top ${className ?? ''}`}>
                  <EncabezadoRol
                    rol={rol}
                    puedeGestionar={puedeGestionar}
                    dominado={rolDominado(misPermisos, rol.concesiones)}
                    alEliminar={() => void setParametros({ eliminar: rol.id })}
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
              alAplicar={(rol, cambio) => void aplicar(rol, cambio)}
            />
          ))}
        </Table>
      </div>
      <NuevoRol
        abierto={panel === 'nuevo-rol'}
        alCerrar={() => void setParametros({ panel: null })}
        alCrear={(rol) => void setParametros({ panel: null, rol })}
      />
      <EliminarRol
        rol={roles.find((rol) => rol.id === eliminar) ?? null}
        alCerrar={() => void setParametros({ eliminar: null })}
      />
    </div>
  )
}
