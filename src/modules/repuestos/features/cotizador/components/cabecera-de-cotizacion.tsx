'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFecha } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { useRegional } from '@/shared/ui/regional'
import type { CotizacionLeida } from '../../../entities/cotizador/hoja-de-lectura'
import { EstadoDeCotizacion } from './estado-de-cotizacion'

type Props = {
  cotizacion: CotizacionLeida
  proyecto: { id: string; numero: number }
  acciones?: React.ReactNode
}

// La cabecera de una cotización de repuestos (8.12-3; extraída en 8.12-4 para las dos hojas): volver al proyecto, el número, el estado, la moneda, las
// fechas y, si las hay, las acciones («Aceptar», «Anular»).
export function CabeceraDeCotizacion({ cotizacion, proyecto, acciones }: Props) {
  const { zonaHoraria } = useRegional()
  const volver = `${RUTAS.repuestos}/${proyecto.id}?pestana=cotizaciones`
  return (
    <header className="grid gap-2">
      <Link
        href={volver as Route}
        className="w-fit text-(length:--text-sm) underline-offset-2 hover:underline"
      >
        Volver al proyecto
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-(length:--text-xl) font-semibold">
          Cotización #{String(cotizacion.numero)}
        </h1>
        <EstadoDeCotizacion estado={cotizacion.estado} />
        {acciones ? <div className="flex flex-wrap gap-2 md:ml-auto">{acciones}</div> : null}
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Proyecto #{String(proyecto.numero)} · {cotizacion.moneda} · Creada el{' '}
        {formatearFecha(cotizacion.creadoEn, { zona: zonaHoraria })}
        {cotizacion.aceptadaEn
          ? ` · Aceptada el ${formatearFecha(cotizacion.aceptadaEn, { zona: zonaHoraria })}`
          : null}
      </p>
    </header>
  )
}
