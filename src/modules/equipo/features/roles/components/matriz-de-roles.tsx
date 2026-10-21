'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import type { Permisos } from '@/shared/lib/permisos'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { EstadoVacio } from '@/shared/ui/estados'
import { rolDominado } from '../../../entities/dominancia'
import type { GrupoDePermisos, OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import { useMatriz } from '../hooks/use-matriz'
import { CabeceraMatriz } from './cabecera-matriz'
import { EliminarRol } from './eliminar-rol'
import type { ColumnaDeRol } from './grupo-matriz'
import { ListaDelRol } from './lista-del-rol'
import { NuevoRol } from './nuevo-rol'
import { SelectorDeRol } from './selector-de-rol'
import { TablaDeRoles } from './tabla-de-roles'

type Props = {
  roles: RolConConcesiones[]
  // El catálogo de permisos, ya agrupado por módulo.
  grupos: GrupoDePermisos[]
  origenes: OrigenDeLaMatriz[]
  // Con qué se dibuja la dominancia: lo que la persona no tiene, no lo puede dar.
  misPermisos: Permisos
  puedeGestionar: boolean
}

// Roles × permisos. Cada celda guarda sola; el panel abierto y el rol a la vista viven en la URL.
export function MatrizDeRoles({ roles, grupos, origenes, misPermisos, puedeGestionar }: Props) {
  const [{ rol: rolElegido, panel, eliminar }, setParametros] = useQueryStates(
    { rol: parseAsString, panel: parseAsString, eliminar: parseAsString },
    { shallow: false },
  )
  const { aplicar, rolEnCurso } = useMatriz()
  // Una sola vista, la que dice el ancho: la tabla desde 768 px (todos los roles) y, por debajo, la lista de un rol (5a-16).
  const enTabla = useAlMenos(CORTE_DE_LA_TABLA)
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
  }))
  const columnaALaVista = columnas.find(({ rol }) => rol.id === aLaVista.id) ?? columnas[0]

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
        {enTabla || !columnaALaVista ? (
          <TablaDeRoles
            grupos={grupos}
            columnas={columnas}
            origenes={origenes}
            misPermisos={misPermisos}
            puedeGestionar={puedeGestionar}
            alEliminar={(rolId) => void setParametros({ eliminar: rolId })}
            alAplicar={(rol, cambio) => void aplicar(rol, cambio)}
          />
        ) : (
          <ListaDelRol
            grupos={grupos}
            columna={columnaALaVista}
            origenes={origenes}
            misPermisos={misPermisos}
            puedeGestionar={puedeGestionar}
            dominado={rolDominado(misPermisos, columnaALaVista.rol.concesiones)}
            alEliminar={() => void setParametros({ eliminar: columnaALaVista.rol.id })}
            alAplicar={(cambio) => void aplicar(columnaALaVista.rol, cambio)}
          />
        )}
      </div>
      <NuevoRol
        abierto={puedeGestionar && panel === 'nuevo-rol'}
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
