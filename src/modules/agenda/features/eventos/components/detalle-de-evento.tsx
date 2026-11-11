import Link from 'next/link'
import type { Route } from 'next'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { ETIQUETA_DE_VISIBILIDAD } from '../../../entities/agenda'
import { rutaDeVinculo, type ClaveDeVinculo, type DetalleDeEvento } from '../../../entities/detalle'

const VINCULOS: readonly { clave: ClaveDeVinculo; texto: string }[] = [
  { clave: 'lead', texto: 'Ver el lead' },
  { clave: 'vehiculo', texto: 'Ver el vehículo' },
  { clave: 'cotizacion', texto: 'Ver la cotización' },
]

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-sm) text-(--color-ink-soft)">{titulo}</dt>
      <dd className="text-(length:--text-base) break-words text-(--color-ink)">{children}</dd>
    </div>
  )
}

// Lo que se ve de un evento: qué es, cuándo, dónde, quién lo creó y a quién invitó (la lista, sólo si lo creó quien mira), y los vínculos. El texto del
// usuario se dibuja como texto (nunca HTML) y respeta sus saltos de línea.
export function VistaDeEvento({ evento, zona }: { evento: DetalleDeEvento; zona: string }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-(length:--text-sm) font-semibold text-(--color-info-ink)">
          Evento
        </span>
        <Badge variant="outline">
          {ETIQUETA_DE_VISIBILIDAD[evento.visibilidad] ?? evento.visibilidad}
        </Badge>
      </div>
      <h2 className="text-(length:--text-lg) font-semibold break-words text-(--color-ink)">
        {evento.titulo}
      </h2>
      <dl className="grid gap-3">
        <Dato titulo="Empieza">{formatearFechaHora(evento.iniciaEn, { zona })}</Dato>
        {evento.terminaEn ? (
          <Dato titulo="Termina">{formatearFechaHora(evento.terminaEn, { zona })}</Dato>
        ) : null}
        {evento.lugar ? <Dato titulo="Lugar">{evento.lugar}</Dato> : null}
        {evento.descripcion ? (
          <Dato titulo="Descripción">
            <span className="whitespace-pre-wrap">{evento.descripcion}</span>
          </Dato>
        ) : null}
        {evento.creadoPorNombre ? <Dato titulo="Lo creó">{evento.creadoPorNombre}</Dato> : null}
        {evento.destinatarios ? (
          <Dato titulo="Invitados">
            <ul className="grid gap-0.5">
              {evento.destinatarios.map((persona) => (
                <li key={persona.id}>{persona.nombre}</li>
              ))}
            </ul>
          </Dato>
        ) : null}
      </dl>
      <ul className="grid gap-1">
        {VINCULOS.flatMap(({ clave, texto }) => {
          const id = evento.vinculos[clave]
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
