'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import type { FilaDePago } from '../../../entities/dinero/listas'
import { EstadoDelPago } from './estado-del-pago'
import { MontoDeLaFila } from './monto-de-la-fila'

type Props = {
  pagos: readonly FilaDePago[]
  alAbrir: (id: string) => void
  abierta: string | null
}

// Los pagos de la página en el celular: una tarjeta por pago, con lo mismo que la fila de la tabla. Un toque abre el panel de la unidad.
export function TarjetasDePagos({ pagos, alAbrir, abierta }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {pagos.map((pago) => (
        <TarjetaDeLista
          key={pago.id}
          abierta={abierta === pago.vehiculoId}
          alAbrir={() => {
            alAbrir(pago.vehiculoId)
          }}
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <AbrirResumen
              nombre={`unidad ${pago.vehiculoTitulo}, pago ${pago.concepto}`}
              className="min-w-0 font-medium break-words text-(--color-ink)"
            >
              {pago.concepto}
            </AbrirResumen>
            <MontoDeLaFila monto={pago.monto} moneda={pago.moneda} montoBase={pago.montoBase} />
          </div>
          <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
            {pago.vehiculoTitulo} · {formatearFecha(pago.fecha, { zona: zonaHoraria })}
            {pago.metodo ? ` · ${pago.metodo}` : ''}
          </p>
          <EstadoDelPago pago={pago} />
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
