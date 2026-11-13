'use client'

import { Fragment } from 'react'
import { formatearHora } from '@/shared/lib/fechas'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { DiaDeActividad } from '../../../entities/filtros'
import { textosDeLaFila } from './celdas-de-actividad'

type Props = {
  dias: readonly DiaDeActividad[]
  abrir: (id: number) => void
  idAbierto: number | null
}

const COLUMNAS = 5

// La actividad en escritorio, agrupada por día: una fila de cabecera por día y una por cambio. Una fila visible abre su diff (con el teclado,
// el botón de la acción); una sin acceso no promete un clic. Ningún valor ni monto: sólo qué campos cambiaron.
export function TablaDeActividad({ dias, abrir, idAbierto }: Props) {
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
                <FilaDeLista
                  key={fila.id}
                  alAbrir={fila.visible ? () => abrir(fila.id) : undefined}
                  abierta={fila.id === idAbierto}
                >
                  <CeldaPegada lado="nombre" className="whitespace-nowrap tabular-nums">
                    {formatearHora(fila.creadoEn, { zona: zonaHoraria })}
                  </CeldaPegada>
                  <TableCell className="max-w-48 truncate">{textos.persona}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {fila.visible ? (
                      <AbrirResumen nombre={`${textos.accion} ${textos.entidad}`}>
                        {textos.accion}
                      </AbrirResumen>
                    ) : (
                      textos.accion
                    )}
                  </TableCell>
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
