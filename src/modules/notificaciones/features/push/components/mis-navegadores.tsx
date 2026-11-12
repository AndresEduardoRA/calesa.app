'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { nombreDelNavegador } from '../../../entities/navegador'
import type { SuscripcionPropia } from '../../../entities/suscripcion'

type Props = {
  suscripciones: SuscripcionPropia[]
  // El endpoint de este navegador, para marcarlo.
  esteNavegador: string | null
  ocupado: boolean
  alQuitar: (endpoint: string) => void
}

// «Tus navegadores»: las suscripciones propias, la más reciente primero. Nunca muestra el endpoint. Quitar es reversible
// (se vuelve a encender), así que no pide confirmación.
export function MisNavegadores({ suscripciones, esteNavegador, ocupado, alQuitar }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <section aria-labelledby="mis-navegadores" className="grid gap-2">
      <h3 id="mis-navegadores" className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Tus navegadores
      </h3>
      {suscripciones.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Todavía no has activado los avisos en ningún navegador.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {suscripciones.map((suscripcion) => (
            <li
              key={suscripcion.endpoint}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-(--radius-card) border border-(--color-line) px-3 py-2"
            >
              <div className="grid min-w-0 gap-0.5 break-words">
                <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
                  {nombreDelNavegador(suscripcion.userAgent)}
                  {suscripcion.endpoint === esteNavegador ? ' · Este navegador' : ''}
                </span>
                <span className="text-(length:--text-sm) text-(--color-ink-faint)">
                  Agregado el {formatearFecha(suscripcion.creadoEn, { zona: zonaHoraria })}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={ocupado}
                onClick={() => alQuitar(suscripcion.endpoint)}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
