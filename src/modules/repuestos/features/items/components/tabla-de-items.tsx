'use client'

import { TablaDeLista } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { nombreDelValor, type CatalogosDeLaHoja } from '../../../entities/items/hoja'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { FaseDelItemInsignia } from './fase-del-item'

type Props = { filas: readonly FilaDeItem[]; catalogos: CatalogosDeLaHoja }

const Vacio = () => <span className="text-(--color-ink-faint)">—</span>

// La hoja en escritorio (8.09-2, C8), de sólo lectura por ahora: una fila por ítem con sus diez columnas. Los números a la derecha, con `tabular-nums`; el precio, siempre por `<Monto>`.
export function TablaDeItems({ filas, catalogos }: Props) {
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <TableHead>Descripción</TableHead>
          <TableHead>Tipo de pieza</TableHead>
          <TableHead>Condición</TableHead>
          <TableHead>País</TableHead>
          <TableHead>Vía</TableHead>
          <TableHead className="text-right">Cant.</TableHead>
          <TableHead className="text-right">Precio al cliente</TableHead>
          <TableHead>Tracking</TableHead>
          <TableHead>Notas</TableHead>
          <TableHead>Fase</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <TableRow key={fila.id}>
            <TableCell className="max-w-64 [overflow-wrap:anywhere]">{fila.descripcion}</TableCell>
            <TableCell>
              {nombreDelValor(catalogos, 'tipo_pieza', fila.tipoPiezaId) ?? <Vacio />}
            </TableCell>
            <TableCell>
              {nombreDelValor(catalogos, 'condicion', fila.condicionId) ?? <Vacio />}
            </TableCell>
            <TableCell>
              {nombreDelValor(catalogos, 'pais_origen', fila.paisOrigenId) ?? <Vacio />}
            </TableCell>
            <TableCell>
              {nombreDelValor(catalogos, 'modo_transporte', fila.modoTransporteId) ?? <Vacio />}
            </TableCell>
            <TableCell className="text-right tabular-nums">{fila.cantidad}</TableCell>
            <TableCell className="text-right">
              {fila.precioCliente === null ? (
                <Vacio />
              ) : (
                <Monto
                  valor={fila.precioCliente}
                  {...(fila.moneda ? { moneda: fila.moneda } : {})}
                />
              )}
            </TableCell>
            <TableCell className="max-w-40 [overflow-wrap:anywhere]">
              {fila.tracking ?? <Vacio />}
            </TableCell>
            <TableCell className="max-w-56 [overflow-wrap:anywhere]">
              {fila.notas ?? <Vacio />}
            </TableCell>
            <TableCell>
              <FaseDelItemInsignia fase={fila.fase} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
