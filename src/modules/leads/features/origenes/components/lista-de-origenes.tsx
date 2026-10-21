'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import {
  sinOrigenesActivos,
  TEXTO_SIN_ORIGENES_ACTIVOS,
  TOPE_DE_ORIGENES_DE_LEAD,
} from '../../../entities/origen-de-lead'
import type { OrigenesDeLead } from '../hooks/use-origenes-de-lead'
import { filasDeOrigenes } from './filas-de-origenes'

type Props = {
  lista: OrigenesDeLead
  alEditar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

export const PREFIJO_DE_ORIGENES = 'origen'

// Los orígenes del lead, en su orden, con el patrón de lista (`@/shared/ui/lista-de-catalogo`). Sin ninguno activo lo dice: el alta sigue
// andando.
export function ListaDeOrigenes({ lista, alEditar, alPedirEliminar }: Props) {
  const { origenes } = lista
  const filas = filasDeOrigenes(origenes, {
    alEditar,
    alActivar: (origen, activo) => void lista.activar(origen, activo),
    alMarcarPorDefecto: (origen, valor) => void lista.marcarPorDefecto(origen, valor),
    alPedirEliminar,
  })
  return (
    <>
      {sinOrigenesActivos(origenes) ? (
        <Aviso tono="aviso">{TEXTO_SIN_ORIGENES_ACTIVOS}</Aviso>
      ) : null}
      <ListaDeCatalogo
        filas={filas}
        prefijo={PREFIJO_DE_ORIGENES}
        columnaDeUso="Leads"
        alAbrir={alEditar}
        alMover={(id, direccion) => {
          const origen = origenes.find((uno) => uno.id === id)
          if (origen) void lista.mover(origen, direccion)
        }}
      />
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {origenes.length} de {TOPE_DE_ORIGENES_DE_LEAD} orígenes posibles.
      </p>
    </>
  )
}
