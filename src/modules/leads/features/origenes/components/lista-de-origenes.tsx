'use client'

import { Aviso } from '@/shared/ui/aviso'
import {
  destinoDeOrigen,
  sinOrigenesActivos,
  TEXTO_SIN_ORIGENES_ACTIVOS,
  TOPE_DE_ORIGENES_DE_LEAD,
} from '../../../entities/origen-de-lead'
import type { OrigenesDeLead } from '../hooks/use-origenes-de-lead'
import { FilaDeOrigen } from './fila-de-origen'

type Props = {
  lista: OrigenesDeLead
  alEditar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

// Las filas de los orígenes, en su orden. Sin ninguno activo lo dice: el alta sigue andando.
export function ListaDeOrigenes({ lista, alEditar, alPedirEliminar }: Props) {
  const { origenes } = lista
  return (
    <>
      {sinOrigenesActivos(origenes) ? (
        <Aviso tono="aviso">{TEXTO_SIN_ORIGENES_ACTIVOS}</Aviso>
      ) : null}
      <ul className="grid divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        {origenes.map((origen) => (
          <FilaDeOrigen
            key={origen.id}
            origen={origen}
            puedeSubir={destinoDeOrigen(origenes, origen.id, 'subir') !== null}
            puedeBajar={destinoDeOrigen(origenes, origen.id, 'bajar') !== null}
            alActivar={(activo) => void lista.activar(origen, activo)}
            alMover={(direccion) => void lista.mover(origen, direccion)}
            alEditar={() => {
              alEditar(origen.id)
            }}
            alPedirEliminar={() => {
              alPedirEliminar(origen.id)
            }}
          />
        ))}
      </ul>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {origenes.length} de {TOPE_DE_ORIGENES_DE_LEAD} orígenes posibles.
      </p>
    </>
  )
}
