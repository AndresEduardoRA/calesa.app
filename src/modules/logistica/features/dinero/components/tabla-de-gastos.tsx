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
import type { FilaDeGasto } from '../../../entities/dinero/listas'
import { MontoDeLaFila } from './monto-de-la-fila'

type Props = {
  gastos: readonly FilaDeGasto[]
  alAbrir: (id: string) => void
  abierta: string | null
}

// Los gastos de la página en escritorio, con el patrón de lista: la unidad es el botón de la fila y abre su panel (`?vehiculo=`). Sin «⋯» ni acciones por fila: corregir, eliminar o
// ver el comprobante se hace en el panel de la unidad (D7 de 6.11-3).
export function TablaDeGastos({ gastos, alAbrir, abierta }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Unidad</CabeceraPegada>
          <TableHead>Categoría</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gastos.map((gasto) => (
          <FilaDeLista
            key={gasto.id}
            abierta={abierta === gasto.vehiculoId}
            alAbrir={() => {
              alAbrir(gasto.vehiculoId)
            }}
          >
            <CeldaPegada lado="nombre">
              <AbrirResumen
                nombre={`unidad ${gasto.vehiculoTitulo}`}
                className="max-w-60 truncate font-medium text-(--color-ink)"
              >
                {gasto.vehiculoTitulo}
              </AbrirResumen>
            </CeldaPegada>
            <TableCell>{gasto.categoriaNombre}</TableCell>
            <TableCell className="max-w-48 truncate">
              {gasto.proveedor ?? <span className="text-(--color-ink-faint)">—</span>}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatearFecha(gasto.fecha, { zona: zonaHoraria })}
            </TableCell>
            <TableCell className="text-right">
              <MontoDeLaFila
                monto={gasto.monto}
                moneda={gasto.moneda}
                montoBase={gasto.montoBase}
              />
            </TableCell>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
