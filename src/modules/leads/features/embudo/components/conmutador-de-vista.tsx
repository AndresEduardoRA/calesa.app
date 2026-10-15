import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_VISTA, VISTA_EMBUDO } from '../../../entities/tablero'

type Props = { actual: 'lista' | 'embudo' }

const OPCIONES = [
  { clave: 'lista', titulo: 'Lista', href: RUTAS.leads },
  { clave: 'embudo', titulo: 'Embudo', href: `${RUTAS.leads}?${CLAVE_DE_VISTA}=${VISTA_EMBUDO}` },
] as const

// «Lista | Embudo» arriba de `/leads`. Son enlaces: cada vista lee lo suyo en el servidor.
export function ConmutadorDeVista({ actual }: Props) {
  return (
    <nav
      aria-label="Vista de leads"
      className="inline-flex rounded-(--radius-md) border border-(--color-line) p-0.5"
    >
      {OPCIONES.map((opcion) => {
        const activa = opcion.clave === actual
        return (
          <Link
            key={opcion.clave}
            href={opcion.href as Route}
            aria-current={activa ? 'page' : undefined}
            className={`inline-flex min-h-10 items-center rounded-[calc(var(--radius-md)-2px)] px-3 text-(length:--text-sm) font-medium md:min-h-8 ${
              activa
                ? 'bg-(--color-surface-3) text-(--color-ink)'
                : 'text-(--color-ink-soft) hover:text-(--color-ink)'
            }`}
          >
            {opcion.titulo}
          </Link>
        )
      })}
    </nav>
  )
}
