'use client'

import { Badge } from '@/shared/ui/badge'
import { formatearFecha } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  MasAcciones,
  TablaDeLista,
  type AccionDeMenu,
} from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { FilaDeStock } from '../../../entities/stock/listado'
import { vehiculoDelStock } from '../../../entities/stock/vista'

export type PropsDeLaListaDeStock = {
  filas: readonly FilaDeStock[]
  alAbrir: (fila: FilaDeStock) => void
  // El «⋯» de cada fila, sólo con `repuestos.editar` (nulo: no se dibuja).
  menu: ((fila: FilaDeStock) => readonly AccionDeMenu[]) | null
}

// Lo que está en stock en escritorio, con el patrón de lista (8.10-3, C9): el ítem es el botón de la fila y abre su panel de stock en la hoja del proyecto.
export function TablaDeStock({ filas, alAbrir, menu }: PropsDeLaListaDeStock) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Ítem</CabeceraPegada>
          <TableHead>Proyecto</TableHead>
          <TableHead className="text-right">En stock</TableHead>
          <TableHead>Desde</TableHead>
          {menu ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <FilaDeLista
            key={fila.id}
            alAbrir={() => {
              alAbrir(fila)
            }}
          >
            <CeldaPegada lado="nombre">
              <AbrirResumen
                nombre={`ítem ${fila.descripcion}`}
                className="block max-w-72 truncate font-medium text-(--color-ink)"
              >
                {fila.descripcion}
              </AbrirResumen>
            </CeldaPegada>
            <TableCell className="max-w-72">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">
                  <span className="tabular-nums">#{fila.proyectoNumero}</span> ·{' '}
                  {vehiculoDelStock(fila)}
                </span>
                {fila.proyectoCerradoEn ? <Badge variant="outline">Cerrado</Badge> : null}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatearNumero(fila.stockCantidad)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatearFecha(fila.enStockDesde, { zona: zonaHoraria })}
            </TableCell>
            {menu ? (
              <CeldaPegada lado="acciones">
                <MasAcciones nombre={fila.descripcion} id={fila.id} acciones={menu(fila)} />
              </CeldaPegada>
            ) : null}
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
