import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'

type Props = {
  // Cuántos campos del layout se pueden filtrar hoy.
  filtrables: number
  // Quien configura los leads puede ir a cambiar qué campos son filtrables.
  puedeConfigurar: boolean
}

// De dónde salen los filtros del panel. Sin campos filtrables lo dice, en vez de dejar un panel
// casi vacío sin explicación.
export function PieDeFiltros({ filtrables, puedeConfigurar }: Props) {
  return (
    <div className="grid gap-1 border-t border-(--color-line) pt-3 text-(length:--text-xs) text-(--color-ink-soft)">
      <p>
        {filtrables === 0
          ? 'Todavía no hay campos para filtrar: sólo están los filtros comunes.'
          : 'Los demás filtros salen de los campos filtrables de los leads.'}
      </p>
      {puedeConfigurar ? (
        <Link
          href={`${RUTAS.configuracionDeLeads}?seccion=campos` as Route}
          className="w-fit text-(--color-primario-ink) underline-offset-2 hover:underline"
        >
          Configurar los campos
        </Link>
      ) : null}
    </div>
  )
}
