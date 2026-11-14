'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { MouseEvent } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import { textoDeLosDiasEnLaFase } from '../../../entities/cadena/dias'
import type { TarjetaDeLaCadena as Tarjeta } from '../../../entities/cadena/leer'
import { EstadoDeLaTarjeta } from './estado-de-la-tarjeta'

type Props = {
  tarjeta: Tarjeta
  // El instante de la lectura (lo toma el servidor): los días de la fase se cuentan contra él, así el HTML y la hidratación coinciden.
  ahora: Date
  // A dónde lleva el nombre: la URL de ahora con `vehiculo=<id>` (clic con Ctrl, otra pestaña con el panel abierto).
  href: string
  alAbrir: (id: string) => void
}

// Un clic común abre el panel sin recargar y suma al historial; con una tecla (Ctrl, Mayús, Alt, Meta) o un botón que no es el principal, el navegador hace lo suyo con el enlace.
function esClicComun(e: MouseEvent): boolean {
  return (
    !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
  )
}

// Una unidad en su columna: el nombre (la identidad «<principal> · <título>», ya armada), VIN y lote, los días en la fase, la situación si la subasta manda, «Demorado» con texto cuando la base lo calculó, y el contenedor y la ETA si hay.
// Sin foto: se reconoce por el nombre y los códigos, y 350 miniaturas pesan.
export function TarjetaDeLaCadena({ tarjeta, ahora, href, alAbrir }: Props) {
  const { zonaHoraria } = useRegional()
  const codigos = [
    tarjeta.vin ? `VIN ${tarjeta.vin}` : null,
    tarjeta.lote ? `Lote ${tarjeta.lote}` : null,
  ].filter((texto) => texto !== null)
  const dias = textoDeLosDiasEnLaFase(tarjeta.faseDesde, ahora)
  const transporte = [
    tarjeta.contenedor ? `Contenedor ${tarjeta.contenedor}` : null,
    tarjeta.etaEl ? `ETA ${formatearFecha(tarjeta.etaEl, { zona: zonaHoraria })}` : null,
  ].filter((texto) => texto !== null)
  return (
    <article className="grid min-w-0 gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3">
      <Link
        href={href as Route}
        prefetch={false}
        scroll={false}
        data-tarjeta={tarjeta.id}
        onClick={(e) => {
          if (esClicComun(e)) {
            e.preventDefault()
            alAbrir(tarjeta.id)
          }
        }}
        className="flex min-h-11 items-center rounded-(--radius-input) text-(length:--text-sm) font-medium break-words text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) md:min-h-0"
      >
        {tarjeta.nombre}
      </Link>
      {codigos.length > 0 ? (
        <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
          {codigos.join(' · ')}
        </p>
      ) : null}
      <EstadoDeLaTarjeta tarjeta={tarjeta} dias={dias} />
      {transporte.length > 0 ? (
        <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
          {transporte.join(' · ')}
        </p>
      ) : null}
    </article>
  )
}
