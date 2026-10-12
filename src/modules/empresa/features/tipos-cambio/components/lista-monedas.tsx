'use client'

import { PlusIcon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { Moneda } from '../../../entities/tipos-cambio'

type Props = {
  monedas: readonly Moneda[]
  monedaBase: string
  puedeGestionar: boolean
  alAbrir: (codigo: string) => void
  alCrear: () => void
}

// Las monedas con las que trabaja la empresa. La base se elige en la pestaña «Empresa».
export function ListaMonedas({ monedas, monedaBase, puedeGestionar, alAbrir, alCrear }: Props) {
  return (
    <section aria-labelledby="monedas-titulo" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="monedas-titulo" className="text-(length:--text-lg) font-medium text-(--color-ink)">
          Monedas
        </h2>
        {puedeGestionar ? (
          <Button variant="outline" className="h-11 md:h-8" onClick={alCrear}>
            <PlusIcon aria-hidden />
            Nueva moneda
          </Button>
        ) : null}
      </div>
      <ul className="divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        {monedas.map((moneda) => (
          <li key={moneda.codigo}>
            <button
              type="button"
              className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)"
              onClick={() => {
                alAbrir(moneda.codigo)
              }}
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-mono text-(length:--text-sm) text-(--color-ink-soft)">
                  {moneda.codigo}
                </span>
                <span className="truncate text-(length:--text-base) font-medium text-(--color-ink)">
                  {moneda.nombre}
                </span>
                {moneda.codigo === monedaBase ? <Badge variant="secondary">Base</Badge> : null}
                {moneda.activa ? null : <Badge variant="outline">Inactiva</Badge>}
              </span>
              <span className="shrink-0 text-(length:--text-sm) text-(--color-ink-faint)">
                {moneda.simbolo}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
