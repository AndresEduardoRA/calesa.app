'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFecha } from '@/shared/lib/fechas'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import { useRegional } from '@/shared/ui/regional'
import { nombreDeCatalogo, type UnidadDelGrupo } from '../../../entities/transporte/grupos'
import type { CatalogosParaNombrar } from './tipos-de-la-lista'
import { ValorDelGrupo } from './valor-del-grupo'

type Props = {
  unidades: readonly UnidadDelGrupo[]
  catalogos: CatalogosParaNombrar
}

function Dato({ etiqueta, texto }: { etiqueta: string; texto: string | null }) {
  return (
    <div className="flex min-w-0 gap-1">
      <dt className="text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="[overflow-wrap:anywhere]">
        <ValorDelGrupo texto={texto} />
      </dd>
    </div>
  )
}

// Las unidades del grupo que quien mira ve: el título (un enlace a la unidad si es un vehículo; un repuesto aún no tiene página, 8.13), su fase en texto y la naviera, el ETA y el arribo de
// ESA unidad. Sin «días en la fase»: `transporte_grupo` no lo trae y pedirlo por fila sería una lectura por unidad (D26).
export function UnidadesDelGrupo({ unidades, catalogos }: Props) {
  const { zonaHoraria } = useRegional()
  const dia = (iso: string | null) =>
    iso === null ? null : formatearFecha(iso, { zona: zonaHoraria })
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Unidades del grupo">
      {unidades.map((u) => (
        <li
          key={u.transporteId}
          className="grid min-w-0 gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-3 py-2"
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            {u.vehiculoId === null ? (
              <span className="min-w-0 font-medium break-words text-(--color-ink)">{u.titulo}</span>
            ) : (
              <Link
                href={unidadDeLogistica(u.vehiculoId) as Route}
                className="min-w-0 font-medium break-words text-(--color-ink) underline-offset-2 hover:underline"
              >
                {u.titulo}
              </Link>
            )}
            <span className="text-(length:--text-sm) text-(--color-ink-soft)">
              {u.fase ?? 'Sin fase'}
            </span>
          </div>
          <dl className="grid gap-0.5 text-(length:--text-sm) sm:grid-cols-3">
            <Dato etiqueta="Naviera" texto={nombreDeCatalogo(catalogos.navieras, u.navieraId)} />
            <Dato etiqueta="ETA" texto={dia(u.etaEl)} />
            <Dato etiqueta="Arribo" texto={dia(u.arriboEl)} />
          </dl>
        </li>
      ))}
    </ul>
  )
}
