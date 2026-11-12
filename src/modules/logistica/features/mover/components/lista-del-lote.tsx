'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import type { VistaPreviaDeUnaUnidad } from '@/modules/flujos/client'
import { lineaDeLaVista, type FaseDelLote } from '../lote/vista-del-lote'

// Cuántas unidades se listan antes de «Mostrar todas» (el lote llega a 200).
export const PRIMEROS_DEL_LOTE = 20

type Props = {
  vistas: readonly VistaPreviaDeUnaUnidad[]
  nombres: ReadonlyMap<string, string>
  fase: FaseDelLote
}

// Qué dice la vista previa de cada unidad: su nombre y «Lista» o lo que le falta. Las primeras 20; las demás con «Mostrar todas».
export function ListaDelLote({ vistas, nombres, fase }: Props) {
  const [todas, setTodas] = useState(false)
  const visibles = todas ? vistas : vistas.slice(0, PRIMEROS_DEL_LOTE)
  return (
    <div className="grid gap-2">
      <ul role="list" aria-label="Unidades del lote" className="grid gap-1.5">
        {visibles.map((vista) => (
          <li
            key={vista.vehiculoId}
            data-unidad-del-lote={vista.vehiculoId}
            className="grid gap-0.5 rounded-(--radius-input) border border-(--color-line) bg-(--color-surface) px-3 py-2 text-(length:--text-sm)"
          >
            <span className="font-medium break-words text-(--color-ink)">
              {nombres.get(vista.vehiculoId) ?? 'Una unidad'}
            </span>
            <span className="text-(--color-ink-soft)">{lineaDeLaVista(vista, fase)}</span>
          </li>
        ))}
      </ul>
      {!todas && vistas.length > PRIMEROS_DEL_LOTE ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-8"
          onClick={() => {
            setTodas(true)
          }}
        >
          Mostrar todas
        </Button>
      ) : null}
    </div>
  )
}
