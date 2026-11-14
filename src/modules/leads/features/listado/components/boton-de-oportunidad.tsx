'use client'

import { PlusIcon } from 'lucide-react'
import type { FilaDeLead } from '../../../entities/listado'
import type { ParaMarcar } from './tipos'

type Props = {
  lead: FilaDeLead
  marcar: ParaMarcar
  // En la tabla, con su texto; en la tarjeta, sólo el «+» (el texto al 200 % no cabe junto al «⋯»).
  conTexto: boolean
}

// «+ Oportunidad» de una fila: abre el formulario corto sobre ese lead (`?panel=oportunidad-rapida&para=<id>`), sin abrir el drawer. Sólo con
// `leads.editar` y el lead en la cartera (como anotar y agendar: la base vuelve a decidir). Lleva `data-nueva-oportunidad` para que el foco
// vuelva a este botón al cerrar. Con su propio botón, la fila no se abre al pulsarlo (`esClicPropio`).
export function BotonDeOportunidad({ lead, marcar, conTexto }: Props) {
  const { alAccion } = marcar
  if (alAccion === null || !lead.enCartera) {
    return null
  }
  return (
    <button
      type="button"
      data-nueva-oportunidad={lead.id}
      aria-label={`+ Oportunidad para ${lead.nombre}`}
      title="+ Oportunidad"
      onClick={() => {
        alAccion('oportunidad', lead.id)
      }}
      className={`flex shrink-0 items-center justify-center gap-1 rounded-(--radius-md) text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) ${conTexto ? 'size-[44px] md:h-8 md:w-auto md:px-2' : 'size-[44px]'}`}
    >
      <PlusIcon aria-hidden className="size-4" />
      {conTexto ? <span className="hidden whitespace-nowrap md:inline">Oportunidad</span> : null}
    </button>
  )
}
