'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import type { CotizacionGuardada as Guardada } from '../../../entities/guardado'
import { rutaDeLaCotizacion, rutaDelPdf } from '../../../entities/ruta-de-la-hoja'

type Props = {
  cotizacion: Guardada
  // Lo que se guardó fue el pedido que había quedado sin confirmar, no lo de la hoja de ese momento.
  fueReenvio: boolean
  alCotizarOtra: () => void
}

// Lo que se ve al guardar (P1): el número y el total de **lo guardado** (la respuesta de la base, no lo tipeado), «Cotizar otra», «Abrir la cotización» (su página, 4.15-3) y
// «Descargar PDF» (4.18-3b, P6 del 4.18-3). El número es un identificador: va sin separador de miles.
export function CotizacionGuardada({ cotizacion, fueReenvio, alCotizarOtra }: Props) {
  return (
    <section
      aria-labelledby="cotizacion-guardada"
      data-cotizacion-guardada=""
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line-strong) bg-(--color-surface) p-4"
    >
      <h2
        id="cotizacion-guardada"
        className="text-(length:--text-lg) font-semibold text-(--color-ink)"
      >
        Cotización n.º {String(cotizacion.numero)} guardada
      </h2>
      <p className="flex flex-wrap items-baseline gap-x-2 text-(--color-ink)">
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">Total</span>
        <strong
          data-total-guardado=""
          className="text-(length:--text-xl) font-semibold tabular-nums"
        >
          {cotizacion.totalUsd === null ? '—' : <Monto valor={cotizacion.totalUsd} moneda="USD" />}
        </strong>
      </p>
      <div role="status">
        {cotizacion.repetido ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Esta cotización ya se había guardado antes de que se cortara la conexión. Lo que ves es
            lo guardado; lo que tipeaste después no se guardó.
          </p>
        ) : fueReenvio ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Se guardó el pedido que había quedado sin confirmar. Lo que tipeaste después no se
            guardó.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11 md:min-h-8" onClick={alCotizarOtra}>
          Cotizar otra
        </Button>
        <Link
          href={rutaDeLaCotizacion(cotizacion.id) as Route}
          className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-8' })}
        >
          Abrir la cotización
        </Link>
        {/* Un enlace simple, sin JS propio: el nombre del archivo lo da la ruta. No es un `Link`: la ruta es un route handler y no se precarga. */}
        <a
          href={rutaDelPdf(cotizacion.id)}
          download
          className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-8' })}
        >
          Descargar PDF
        </a>
      </div>
    </section>
  )
}
