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
import {
  estadoDeLaFila,
  textoDeItems,
  vehiculoDeLaFila,
  type FilaDeProyecto,
} from '../../../entities/proyectos/listado'
import { EstadoDelProyecto } from './estado-del-proyecto'

type Props = { proyectos: readonly FilaDeProyecto[]; alAbrir: (id: string) => void }

// Los proyectos de la página en escritorio, con el patrón de lista: el número es el botón de la fila y abre el proyecto. Sin «⋯»: cerrar y eliminar viven en la pantalla del proyecto.
export function TablaDeProyectos({ proyectos, alAbrir }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">N.º</CabeceraPegada>
          <TableHead>Vehículo</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Ítems</TableHead>
          <TableHead>Última actividad</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {proyectos.map((proyecto) => {
          const vehiculo = vehiculoDeLaFila(proyecto)
          return (
            <FilaDeLista
              key={proyecto.id}
              alAbrir={() => {
                alAbrir(proyecto.id)
              }}
            >
              <CeldaPegada lado="nombre">
                <AbrirResumen
                  nombre={`proyecto ${String(proyecto.numero)}`}
                  className="font-medium text-(--color-ink) tabular-nums"
                >
                  #{proyecto.numero}
                </AbrirResumen>
              </CeldaPegada>
              <TableCell className="max-w-64">
                <span className="block truncate">{vehiculo.titulo}</span>
                {vehiculo.detalle ? (
                  <span className="block truncate text-(length:--text-xs) text-(--color-ink-soft)">
                    {vehiculo.detalle}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="max-w-48 truncate">
                {proyecto.clienteNombre ?? <span className="text-(--color-ink-faint)">—</span>}
              </TableCell>
              <TableCell>
                <EstadoDelProyecto estado={estadoDeLaFila(proyecto)} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {textoDeItems(proyecto.items)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatearFecha(proyecto.ultimaActividad, { zona: zonaHoraria })}
              </TableCell>
            </FilaDeLista>
          )
        })}
      </TableBody>
    </TablaDeLista>
  )
}
