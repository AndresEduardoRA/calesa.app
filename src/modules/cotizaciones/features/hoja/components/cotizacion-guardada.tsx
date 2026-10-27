'use client'

import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import type { CotizacionGuardada as Guardada } from '../../../entities/guardado'

type Props = {
  cotizacion: Guardada
  // Lo que se guardó fue el pedido que había quedado sin confirmar, no lo de la hoja de ese momento.
  fueReenvio: boolean
  alCotizarOtra: () => void
}

// Lo que se ve al guardar (P1): el número y el total de **lo guardado** (la respuesta de la base, no lo tipeado), y «Cotizar otra». Ver y editar la cotización es del 4.15.
// El número es un identificador: va sin separador de miles.
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
      <div>
        <Button className="min-h-11 md:min-h-8" onClick={alCotizarOtra}>
          Cotizar otra
        </Button>
      </div>
    </section>
  )
}
