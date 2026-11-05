'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { TarjetaDeLista } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { nombreDelOrigen, SIN_NOMBRE, type FilaDeCotizacion, type OrigenDelListado } from './tipos'
import { Vigencia } from './vigencia'

type Props = { cotizaciones: readonly FilaDeCotizacion[]; origenes: readonly OrigenDelListado[] }

// Las cotizaciones de la página en el celular: una tarjeta por cotización, con lo mismo que la fila de la tabla. «N.º n» arriba es el enlace.
export function TarjetasDeCotizaciones({ cotizaciones, origenes }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {cotizaciones.map((cotizacion) => (
        <TarjetaDeLista key={cotizacion.id}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={rutaDeLaCotizacion(cotizacion.id) as Route}
              className="font-medium text-(--color-ink) tabular-nums hover:underline"
            >
              N.º {cotizacion.numero}
            </Link>
            <Badge variant="secondary">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
            <span className="ml-auto font-medium tabular-nums">
              <Monto valor={cotizacion.totalBase} />
            </span>
          </div>
          {cotizacion.titulo ? (
            <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink)">
              {cotizacion.titulo}
            </p>
          ) : null}
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
            <span>Cliente: {cotizacion.cliente ?? SIN_NOMBRE}</span>
            <span>Vehículo: {cotizacion.vehiculo ?? SIN_NOMBRE}</span>
            <span>{nombreDelOrigen(origenes, cotizacion.origenId)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
            <span className="text-(length:--text-xs) text-(--color-ink-soft)">
              {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })} · {cotizacion.autor}
            </span>
          </div>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
