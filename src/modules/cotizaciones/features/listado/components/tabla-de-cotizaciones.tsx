'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { nombreDelOrigen, SIN_NOMBRE, type FilaDeCotizacion, type OrigenDelListado } from './tipos'
import { Vigencia } from './vigencia'

type Props = {
  cotizaciones: readonly FilaDeCotizacion[]
  origenes: readonly OrigenDelListado[]
  alAbrir: (id: string) => void
  // La cotización abierta en el resumen, para marcarla.
  abierta: string | null
}

const VACIO = <span className="text-(--color-ink-faint)">{SIN_NOMBRE}</span>

// Las cotizaciones de la página en escritorio, con el patrón de lista (`@/shared/ui/lista`): «N.º n» es el botón de la fila (`<AbrirResumen>`, la parada de Tab) y, debajo, su título. Un clic en la
// fila abre el resumen `?cotizacion=` (4.16-4b); sin «⋯»: las acciones son de los pasos 4.2x.
export function TablaDeCotizaciones({ cotizaciones, origenes, alAbrir, abierta }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Cotización</CabeceraPegada>
          <TableHead>Cliente</TableHead>
          <TableHead>Vehículo</TableHead>
          <TableHead>Origen</TableHead>
          <TableHead>Clase</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Vigencia</TableHead>
          <TableHead>Creada</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cotizaciones.map((cotizacion) => (
          <FilaDeLista
            key={cotizacion.id}
            abierta={abierta === cotizacion.id}
            alAbrir={() => {
              alAbrir(cotizacion.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <div className="grid min-w-0">
                <AbrirResumen
                  nombre={`N.º ${String(cotizacion.numero)}`}
                  className="w-fit font-medium text-(--color-ink) tabular-nums"
                >
                  N.º {cotizacion.numero}
                </AbrirResumen>
                {cotizacion.titulo ? (
                  <span className="max-w-60 truncate text-(length:--text-xs) text-(--color-ink-soft)">
                    {cotizacion.titulo}
                  </span>
                ) : null}
              </div>
            </CeldaPegada>
            <TableCell className="max-w-48 truncate">{cotizacion.cliente ?? VACIO}</TableCell>
            <TableCell className="max-w-48 truncate">{cotizacion.vehiculo ?? VACIO}</TableCell>
            <TableCell className="max-w-40 truncate">
              {nombreDelOrigen(origenes, cotizacion.origenId)}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <Monto valor={cotizacion.totalBase} />
            </TableCell>
            <TableCell>
              <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
            </TableCell>
            <TableCell className="text-(length:--text-sm) text-(--color-ink-soft)">
              {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })} · {cotizacion.autor}
            </TableCell>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
