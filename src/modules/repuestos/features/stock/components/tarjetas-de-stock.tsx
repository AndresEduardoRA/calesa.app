'use client'

import { Badge } from '@/shared/ui/badge'
import { formatearFecha } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { AbrirResumen, MasAcciones, TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { vehiculoDelStock } from '../../../entities/stock/vista'
import type { PropsDeLaListaDeStock } from './tabla-de-stock'

// Lo que está en stock en el celular (8.10-3, C9): una tarjeta por ítem con lo mismo que la fila de la tabla. Un toque abre su panel de stock.
export function TarjetasDeStock({ filas, alAbrir, menu }: PropsDeLaListaDeStock) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {filas.map((fila) => (
        <TarjetaDeLista
          key={fila.id}
          alAbrir={() => {
            alAbrir(fila)
          }}
          acciones={
            menu ? (
              <MasAcciones nombre={fila.descripcion} id={fila.id} acciones={menu(fila)} />
            ) : null
          }
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <AbrirResumen
              nombre={`ítem ${fila.descripcion}`}
              className="min-w-0 font-medium break-words text-(--color-ink)"
            >
              {fila.descripcion}
            </AbrirResumen>
            <span className="tabular-nums">En stock: {formatearNumero(fila.stockCantidad)}</span>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
            <span>
              <span className="tabular-nums">#{fila.proyectoNumero}</span> ·{' '}
              {vehiculoDelStock(fila)} · desde{' '}
              {formatearFecha(fila.enStockDesde, { zona: zonaHoraria })}
            </span>
            {fila.proyectoCerradoEn ? <Badge variant="outline">Cerrado</Badge> : null}
          </p>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
