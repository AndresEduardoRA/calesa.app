'use client'

import { camposDeLaTarjeta, type FilaDeLead } from '../../../entities/listado'
import { MenuDeLead } from '../../marcas/components/menu-de-lead'
import { BadgeDeTipo } from './badge-de-tipo'
import { CeldaDeCampo } from './celda-de-campo'
import { NombreDeFila } from './nombre-de-fila'
import { telefonoDeLista } from './telefono-de-lista'
import { accionesDelMenu, type DatosDeLaLista, nombreDelOrigen, type ParaMarcar } from './tipos'

type Props = DatosDeLaLista & {
  leads: readonly FilaDeLead[]
  alAbrir: (id: string) => void
  marcar: ParaMarcar
}

// Los leads en el celular: una tarjeta por lead con lo mismo que la fila de la tabla y hasta dos
// datos «en la tabla» que ese lead tenga. La tarjeta tiene dos objetivos hermanos (≥ 44 px): la
// zona que abre el drawer y, en la esquina, el «⋯» de las marcas. La columna de la lista y cada tarjeta miden lo que la pantalla
// (`minmax(0, 1fr)` y `min-w-0`): sin eso la columna `auto` toma el ancho mínimo de la tarjeta y, con el texto al 200 %, un nombre que
// no se parte ensancha la página y deja el «⋯» fuera de la vista; el nombre se corta con «…» y el «⋯» no se achica (`shrink-0`).
export function TarjetasDeLeads(props: Props) {
  const { leads, campos, origenes, codigoDePais, etiquetas, alAbrir, marcar } = props
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {leads.map((lead) => {
        const origen = nombreDelOrigen(origenes, lead.origenId)
        const datos = camposDeLaTarjeta(campos, lead)
        return (
          <li key={lead.id} className="min-w-0">
            <article className="flex items-start rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
              <button
                type="button"
                aria-label={`Abrir ${lead.nombre}`}
                className="grid min-h-11 min-w-0 flex-1 gap-2 p-3 text-left outline-none focus-visible:shadow-(--shadow-focus)"
                onClick={() => {
                  alAbrir(lead.id)
                }}
              >
                <span className="flex items-start justify-between gap-2">
                  <NombreDeFila
                    lead={lead}
                    etiquetas={etiquetas}
                    nombre={(clases) => (
                      <span className={`text-(length:--text-base) ${clases}`}>{lead.nombre}</span>
                    )}
                  />
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
              <div className="shrink-0 p-1">
                <MenuDeLead
                  leadId={lead.id}
                  nombre={lead.nombre}
                  marcas={lead.marcas}
                  etiquetas={marcar.etiquetas}
                  alGestionar={marcar.alGestionar}
                  puedeEnviar={marcar.eliminables.includes(lead.id)}
                  acciones={accionesDelMenu(marcar, lead)}
                />
              </div>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
