'use client'

import { camposDeLaTarjeta, type FilaDeLead } from '../../../entities/listado'
import { BadgeDeTipo } from './badge-de-tipo'
import { CeldaDeCampo } from './celda-de-campo'
import { telefonoDeLista } from './telefono-de-lista'
import { nombreDelOrigen, type DatosDeLaLista } from './tipos'

type Props = DatosDeLaLista & {
  leads: readonly FilaDeLead[]
  alAbrir: (id: string) => void
}

// Los leads en el celular: una tarjeta por lead con lo mismo que la fila de la tabla y hasta dos
// datos «en la tabla» que ese lead tenga. Toda la tarjeta abre el drawer (objetivo ≥ 44 px).
export function TarjetasDeLeads({ leads, campos, origenes, codigoDePais, alAbrir }: Props) {
  return (
    <ul className="grid gap-2 md:hidden">
      {leads.map((lead) => {
        const origen = nombreDelOrigen(origenes, lead.origenId)
        const datos = camposDeLaTarjeta(campos, lead)
        return (
          <li key={lead.id}>
            <article className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
              <button
                type="button"
                aria-label={`Abrir ${lead.nombre}`}
                className="grid min-h-11 w-full gap-2 p-3 text-left outline-none focus-visible:shadow-(--shadow-focus)"
                onClick={() => {
                  alAbrir(lead.id)
                }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="grid min-w-0">
                    <span className="truncate text-(length:--text-base) font-medium text-(--color-ink)">
                      {lead.nombre}
                    </span>
                    <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
                      #{lead.numero}
                    </span>
                  </span>
                  <BadgeDeTipo tipo={lead.tipo} />
                </span>
                <span className="text-(length:--text-sm) text-(--color-ink) tabular-nums">
                  {telefonoDeLista(lead.telefono, codigoDePais)}
                </span>
                {origen ? (
                  <span className="text-(length:--text-xs) text-(--color-ink-soft)">{origen}</span>
                ) : null}
                {datos.length > 0 ? (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-(--color-line) pt-2">
                    {datos.map((campo) => (
                      <div key={campo.clave} className="grid min-w-0">
                        <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
                          {campo.etiqueta}
                        </dt>
                        <dd className="truncate text-(length:--text-sm) text-(--color-ink)">
                          <CeldaDeCampo campo={campo} fila={lead} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </button>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
