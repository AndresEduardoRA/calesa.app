'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { FilaDePago } from '../../../entities/dinero/listas'
import { EstadoDelPago } from './estado-del-pago'
import { MontoDeLaFila } from './monto-de-la-fila'

type Props = {
  pagos: readonly FilaDePago[]
  alAbrir: (id: string) => void
  abierta: string | null
}

// Los pagos de la página en escritorio: el concepto es el botón de la fila y abre el panel de su unidad (`?vehiculo=`); debajo, la unidad. Confirmar y anular se hace en el panel.
export function TablaDePagos({ pagos, alAbrir, abierta }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Pago</CabeceraPegada>
          <TableHead>Método</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagos.map((pago) => (
          <FilaDeLista
            key={pago.id}
            abierta={abierta === pago.vehiculoId}
            alAbrir={() => {
              alAbrir(pago.vehiculoId)
            }}
          >
            <CeldaPegada lado="nombre">
              <div className="grid min-w-0">
                <AbrirResumen
                  nombre={`unidad ${pago.vehiculoTitulo}, pago ${pago.concepto}`}
                  className="max-w-60 truncate font-medium text-(--color-ink)"
                >
                  {pago.concepto}
                </AbrirResumen>
                <span className="max-w-60 truncate text-(length:--text-xs) text-(--color-ink-soft)">
                  {pago.vehiculoTitulo}
                </span>
              </div>
            </CeldaPegada>
            <TableCell>
              {pago.metodo ?? <span className="text-(--color-ink-faint)">—</span>}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatearFecha(pago.fecha, { zona: zonaHoraria })}
            </TableCell>
            <TableCell className="text-right">
              <MontoDeLaFila monto={pago.monto} moneda={pago.moneda} montoBase={pago.montoBase} />
            </TableCell>
            <TableCell>
              <EstadoDelPago pago={pago} />
            </TableCell>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
