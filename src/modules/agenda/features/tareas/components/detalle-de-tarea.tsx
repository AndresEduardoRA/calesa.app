import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { ESTADO_DE_TAREA_HECHA } from '../../../entities/agenda'
import { rutaDeVinculo, type ClaveDeVinculo, type DetalleDeTarea } from '../../../entities/detalle'

const VINCULOS: readonly { clave: ClaveDeVinculo; texto: string }[] = [
  { clave: 'lead', texto: 'Ver el lead' },
  { clave: 'vehiculo', texto: 'Ver el vehículo' },
  { clave: 'cotizacion', texto: 'Ver la cotización' },
]

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-sm) text-(--color-ink-soft)">{titulo}</dt>
      <dd className="text-(length:--text-base) break-words text-(--color-ink)">{children}</dd>
    </div>
  )
}

// Lo que se ve de una tarea: qué es, si está pendiente o hecha (con texto y cuándo se hizo), cuándo vence («Sin fecha» si no), para quién es y quién la creó.
// El texto del usuario se dibuja como texto (nunca HTML) y respeta sus saltos de línea.
export function VistaDeTarea({ tarea, zona }: { tarea: DetalleDeTarea; zona: string }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-(length:--text-sm) font-semibold text-(--color-positivo-ink)">
          Tarea
        </span>
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">
          {tarea.estado === ESTADO_DE_TAREA_HECHA
            ? tarea.completadaEn
              ? `Hecha el ${formatearFechaHora(tarea.completadaEn, { zona })}`
              : 'Hecha'
            : 'Pendiente'}
        </span>
      </div>
      <h2 className="text-(length:--text-lg) font-semibold break-words text-(--color-ink)">
        {tarea.titulo}
      </h2>
      <dl className="grid gap-3">
        <Dato titulo="Vence">
          {tarea.venceEn ? formatearFechaHora(tarea.venceEn, { zona }) : 'Sin fecha'}
        </Dato>
        {tarea.responsableNombre ? <Dato titulo="Para">{tarea.responsableNombre}</Dato> : null}
        {tarea.creadoPorNombre ? <Dato titulo="La creó">{tarea.creadoPorNombre}</Dato> : null}
        {tarea.descripcion ? (
          <Dato titulo="Descripción">
            <span className="whitespace-pre-wrap">{tarea.descripcion}</span>
          </Dato>
        ) : null}
      </dl>
      <ul className="grid gap-1">
        {VINCULOS.flatMap(({ clave, texto }) => {
          const id = tarea.vinculos[clave]
          return id
            ? [
                <li key={clave}>
                  <Link
                    href={rutaDeVinculo(clave, id) as Route}
                    className="inline-flex min-h-11 items-center underline md:min-h-8"
                  >
                    {texto}
                  </Link>
                </li>,
              ]
            : []
        })}
      </ul>
    </div>
  )
}
