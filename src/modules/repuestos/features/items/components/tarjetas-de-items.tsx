'use client'

import { Monto } from '@/shared/ui/monto'
import { nombreDelValor, type CatalogosDeLaHoja } from '../../../entities/items/hoja'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { FaseDelItemInsignia } from './fase-del-item'

type Props = { filas: readonly FilaDeItem[]; catalogos: CatalogosDeLaHoja }

// La hoja en el celular (8.09-2, C8), de sólo lectura por ahora: una tarjeta por ítem con lo mismo que la fila de la tabla.
export function TarjetasDeItems({ filas, catalogos }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {filas.map((fila) => {
        const detalle = [
          nombreDelValor(catalogos, 'tipo_pieza', fila.tipoPiezaId),
          nombreDelValor(catalogos, 'condicion', fila.condicionId),
          nombreDelValor(catalogos, 'pais_origen', fila.paisOrigenId),
          nombreDelValor(catalogos, 'modo_transporte', fila.modoTransporteId),
        ].filter((x): x is string => x !== null)
        return (
          <li
            key={fila.id}
            className="grid gap-1 rounded-(--radius-md) border border-(--color-border) p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="min-w-0 font-medium [overflow-wrap:anywhere]">{fila.descripcion}</p>
              <FaseDelItemInsignia fase={fila.fase} />
            </div>
            {detalle.length > 0 ? (
              <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
                {detalle.join(' · ')}
              </p>
            ) : null}
            <p className="text-(length:--text-sm) tabular-nums">
              {fila.cantidad} ×{' '}
              {fila.precioCliente === null ? (
                <span className="text-(--color-ink-faint)">sin precio</span>
              ) : (
                <Monto
                  valor={fila.precioCliente}
                  {...(fila.moneda ? { moneda: fila.moneda } : {})}
                />
              )}
            </p>
            {fila.tracking ? (
              <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
                Tracking {fila.tracking}
              </p>
            ) : null}
            {fila.notas ? (
              <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
                {fila.notas}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
