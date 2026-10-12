'use client'

import { PlusIcon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import type { TipoCambio } from '../../../entities/tipos-cambio'
import { ValorDeCambio } from './valor-de-cambio'

type Props = {
  tipos: readonly TipoCambio[]
  puedeGestionar: boolean
  alAbrir: (id: string) => void
  alCrear: () => void
}

// Los tipos de cambio, cada uno con su valor vigente. Tocar uno abre su panel: ahí se cambia el
// valor y se ve su historial.
export function ListaTiposCambio({ tipos, puedeGestionar, alAbrir, alCrear }: Props) {
  const nuevo = puedeGestionar ? (
    <Button variant="outline" className="h-11 md:h-8" onClick={alCrear}>
      <PlusIcon aria-hidden />
      Nuevo tipo de cambio
    </Button>
  ) : null

  return (
    <section aria-labelledby="tipos-cambio-titulo" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="tipos-cambio-titulo"
          className="text-(length:--text-lg) font-medium text-(--color-ink)"
        >
          Tipos de cambio
        </h2>
        {tipos.length > 0 ? nuevo : null}
      </div>
      {tipos.length === 0 ? (
        <EstadoVacio
          compacto
          titulo="Todavía no hay tipos de cambio"
          descripcion="Con uno entre dos monedas, las cotizaciones pueden mostrar sus totales en las dos."
          accion={nuevo}
        />
      ) : (
        <ul className="divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
          {tipos.map((tipo) => (
            <li key={tipo.id}>
              <button
                type="button"
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)"
                onClick={() => {
                  alAbrir(tipo.id)
                }}
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-(length:--text-base) font-medium text-(--color-ink)">
                    {tipo.nombre}
                  </span>
                  {tipo.esDefault ? <Badge variant="secondary">Por defecto</Badge> : null}
                  {tipo.activo ? null : <Badge variant="outline">Inactivo</Badge>}
                </span>
                <ValorDeCambio tipo={tipo} className="shrink-0 text-(length:--text-base)" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
