import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'

type Props = {
  origen: { id: string; nombre: string }
  // Cuántos campos del layout se pueden filtrar hoy.
  filtrables: number
  // Quien gestiona orígenes puede ir a cambiar qué campos son filtrables.
  puedeConfigurar: boolean
}

// De dónde salen los filtros del panel. Con un origen sin campos filtrables lo dice, en vez de
// dejar un panel casi vacío sin explicación.
export function PieDeFiltros({ origen, filtrables, puedeConfigurar }: Props) {
  return (
    <div className="grid gap-1 border-t border-(--color-line) pt-3 text-(length:--text-xs) text-(--color-ink-soft)">
      <p>
        {filtrables === 0
          ? `${origen.nombre} todavía no tiene campos para filtrar: sólo están los filtros comunes.`
          : `Los demás filtros salen de los campos filtrables de ${origen.nombre}.`}
      </p>
      {puedeConfigurar ? (
        <Link
          href={`${RUTAS.origenes}/${origen.id}?seccion=campos` as Route}
          className="w-fit text-(--color-primario-ink) underline-offset-2 hover:underline"
        >
          Configurar los campos
        </Link>
      ) : null}
    </div>
  )
}
