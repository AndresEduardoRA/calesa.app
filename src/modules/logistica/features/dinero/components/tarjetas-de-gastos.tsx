'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import type { FilaDeGasto } from '../../../entities/dinero/listas'
import { MontoDeLaFila } from './monto-de-la-fila'

type Props = {
  gastos: readonly FilaDeGasto[]
  alAbrir: (id: string) => void
  abierta: string | null
}

// Los gastos de la página en el celular: una tarjeta por gasto, con lo mismo que la fila de la tabla. Un toque abre el panel de la unidad.
export function TarjetasDeGastos({ gastos, alAbrir, abierta }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {gastos.map((gasto) => (
        <TarjetaDeLista
          key={gasto.id}
          abierta={abierta === gasto.vehiculoId}
          alAbrir={() => {
            alAbrir(gasto.vehiculoId)
          }}
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <AbrirResumen
              nombre={`unidad ${gasto.vehiculoTitulo}`}
              className="min-w-0 font-medium break-words text-(--color-ink)"
            >
              {gasto.vehiculoTitulo}
            </AbrirResumen>
            <MontoDeLaFila monto={gasto.monto} moneda={gasto.moneda} montoBase={gasto.montoBase} />
          </div>
          <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
            {gasto.categoriaNombre} · {formatearFecha(gasto.fecha, { zona: zonaHoraria })}
            {gasto.proveedor ? ` · ${gasto.proveedor}` : ''}
          </p>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
