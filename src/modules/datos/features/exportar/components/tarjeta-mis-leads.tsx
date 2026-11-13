import type { Route } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import type { Tarjeta } from '../../../entities/tarjetas'

// «Mis leads»: para todos. Enlaza al exportar de `/leads` (con los filtros del listado); si el rol no puede, apagada con su motivo.
export function TarjetaMisLeads({ tarjeta, href }: { tarjeta: Tarjeta; href: Route }) {
  return (
    <section
      aria-labelledby="datos-mis-leads"
      className="grid min-w-0 justify-items-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <h2 id="datos-mis-leads" className="text-(length:--text-base) font-medium text-(--color-ink)">
        Mis leads
      </h2>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Los leads de tu cartera, con los filtros del listado.
      </p>
      {tarjeta.habilitada ? (
        <Link
          href={href}
          className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-8' })}
        >
          Ir a Leads
        </Link>
      ) : (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">{tarjeta.motivo}</p>
      )}
    </section>
  )
}
