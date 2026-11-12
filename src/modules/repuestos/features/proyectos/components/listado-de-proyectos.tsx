'use client'

import type { ReactNode } from 'react'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { FilterShell } from '@/shared/ui/filtros'
import type { EstadoDelListado, PaginaDeProyectos } from '../../../entities/proyectos/listado'
import { ResultadoDeProyectos } from './resultado-de-proyectos'

type Props = {
  pagina: PaginaDeProyectos
  esquema: EsquemaDeFiltros
  estado: EstadoDelListado
  porPagina: { valor: number; opciones: readonly number[] }
  // «Nuevo proyecto» con su atajo, si la persona puede crear (`repuestos.editar`): la página decide, no este componente.
  nuevo: ReactNode
}

// `/repuestos`: los proyectos de repuestos con sus filtros en la URL (`?q=`, `?estado=`, `?por=`, `?cursor=`). La fila abre `/repuestos/<id>`.
export function ListadoDeProyectos({ pagina, esquema, estado, porPagina, nuevo }: Props) {
  return (
    <FilterShell esquema={esquema} porPagina={porPagina} acciones={nuevo}>
      <ResultadoDeProyectos pagina={pagina} estado={estado} nuevo={nuevo} />
    </FilterShell>
  )
}
