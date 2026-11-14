'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Monto } from '@/shared/ui/monto'
import {
  montoDeLaAprobada,
  SIN_TOTAL,
  type CotizacionAprobadaDeLaFila,
} from '../../../entities/cotizacion-aprobada-de-la-fila'

const VACIO = <span className="text-(--color-ink-faint)">—</span>

// El primer resultado de la aprobada con su moneda congelada, enlazado a la cotización (`data-no-abre`: el clic no abre el resumen del vehículo). Sin total, lo dice.
function Enlace({ aprobada }: { aprobada: CotizacionAprobadaDeLaFila }) {
  const monto = montoDeLaAprobada(aprobada)
  return (
    <Link
      href={aprobada.ruta as Route}
      data-no-abre=""
      className="rounded-(--radius-sm) text-(--color-ink) underline-offset-2 hover:underline"
    >
      {monto === null ? SIN_TOTAL : <Monto valor={monto} moneda={aprobada.moneda} />}
    </Link>
  )
}

// La celda de la tabla: el monto a la derecha, o «—» si el vehículo no tiene una que quien mira vea.
export function CeldaDeAprobada({ aprobada }: { aprobada: CotizacionAprobadaDeLaFila | null }) {
  return aprobada === null ? VACIO : <Enlace aprobada={aprobada} />
}

// En la tarjeta no hay encabezado: lleva su rótulo. Sin aprobada no se dibuja nada.
export function AprobadaDeTarjeta({ aprobada }: { aprobada: CotizacionAprobadaDeLaFila | null }) {
  if (aprobada === null) {
    return null
  }
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-(length:--text-sm)">
      <span className="text-(length:--text-xs) text-(--color-ink-soft)">Cotización aprobada</span>
      <Enlace aprobada={aprobada} />
    </span>
  )
}
