'use client'

import type { ReactNode } from 'react'
import { TablaDeLista } from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { controlesDeItem } from './controles-de-item'

type Props = {
  filas: readonly FilaDeItem[]
  contexto: ContextoDeLaHoja
  // La fila de «Nuevo ítem», al final (sólo con `repuestos.editar`, proyecto abierto y menos de 200).
  filaNueva: ReactNode
}

// La hoja en escritorio (8.09-2, C8): una fila por ítem con sus columnas, editable celda a celda. Los números a la derecha; el precio, por `<Monto>` o `XCell`. La fase es sólo lectura. La fila nueva va al
// final con la descripción: el resto de las columnas se llena después, con el teclado.
export function TablaDeItems({ filas, contexto, filaNueva }: Props) {
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-64">Descripción</TableHead>
          <TableHead>Tipo de pieza</TableHead>
          <TableHead>Condición</TableHead>
          <TableHead>País</TableHead>
          <TableHead>Vía</TableHead>
          <TableHead className="text-right">Cant.</TableHead>
          <TableHead className="text-right">Precio al cliente</TableHead>
          <TableHead>Moneda</TableHead>
          <TableHead>Tracking</TableHead>
          <TableHead>Notas</TableHead>
          <TableHead>Fase</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => {
          const c = controlesDeItem(fila, contexto)
          return (
            <TableRow key={fila.id} data-fila-de-item={fila.id}>
              <TableCell className="min-w-64 align-top">{c.descripcion}</TableCell>
              <TableCell className="align-top">{c.tipoDePieza}</TableCell>
              <TableCell className="align-top">{c.condicion}</TableCell>
              <TableCell className="align-top">{c.pais}</TableCell>
              <TableCell className="align-top">{c.via}</TableCell>
              <TableCell className="min-w-28 text-right align-top tabular-nums">
                {c.cantidad}
              </TableCell>
              <TableCell className="min-w-40 text-right align-top">{c.precio}</TableCell>
              <TableCell className="align-top">{c.moneda}</TableCell>
              <TableCell className="min-w-36 align-top">{c.tracking}</TableCell>
              <TableCell className="min-w-48 align-top">{c.notas}</TableCell>
              <TableCell className="align-top">{c.fase}</TableCell>
              <TableCell className="align-top">
                <div className="flex flex-wrap gap-1">
                  {c.imagenes}
                  {c.hueco}
                  {c.eliminar}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
        {filaNueva ? (
          <TableRow data-fila-de-item="nueva">
            <TableCell className="min-w-64 align-top">{filaNueva}</TableCell>
            <TableCell colSpan={11} />
          </TableRow>
        ) : null}
      </TableBody>
    </TablaDeLista>
  )
}
