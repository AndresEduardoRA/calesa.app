'use client'

import { Fragment } from 'react'
import { formatearHora } from '@/shared/lib/fechas'
import { CabeceraPegada, CeldaPegada, FilaDeLista, TablaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { DiaDeActividad } from '../../../entities/filtros'
import { textosDeLaFila } from './celdas-de-actividad'

const COLUMNAS = 5

// La actividad en escritorio, agrupada por día: una fila de cabecera por día y una por cambio. La fila todavía no abre nada (el diff llega
// en la parte 4): sin `alAbrir`, no promete un clic. Ningún valor ni monto: sólo qué campos cambiaron.
export function TablaDeActividad({ dias }: { dias: readonly DiaDeActividad[] }) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Hora</CabeceraPegada>
          <TableHead>Persona</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>Entidad</TableHead>
          <TableHead>Campos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dias.map((dia) => (
          <Fragment key={dia.dia}>
            <TableRow className="bg-(--color-surface-2) hover:bg-(--color-surface-2)">
              <th
                scope="colgroup"
                colSpan={COLUMNAS}
                className="px-2 py-1.5 text-left text-(length:--text-sm) font-medium text-(--color-ink-soft)"
              >
                {dia.titulo}
              </th>
            </TableRow>
            {dia.filas.map((fila) => {
              const textos = textosDeLaFila(fila)
              return (
                <FilaDeLista key={fila.id}>
                  <CeldaPegada lado="nombre" className="whitespace-nowrap tabular-nums">
                    {formatearHora(fila.creadoEn, { zona: zonaHoraria })}
                  </CeldaPegada>
                  <TableCell className="max-w-48 truncate">{textos.persona}</TableCell>
                  <TableCell className="whitespace-nowrap">{textos.accion}</TableCell>
                  <TableCell className="whitespace-nowrap">{textos.entidad}</TableCell>
                  <TableCell className="max-w-96 truncate text-(--color-ink-soft)">
                    {textos.campos}
                  </TableCell>
                </FilaDeLista>
              )
            })}
          </Fragment>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
