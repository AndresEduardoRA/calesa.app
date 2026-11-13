import type { Route } from 'next'
import Link from 'next/link'
import { rutaDeLaLista, type VistaDeDinero } from '../../../entities/dinero/listas'

// El camino a lo que el tope del hueco no muestra (`.claude/rules/escala.md`): la lista de `/logistica/gastos` de esa vista, ya filtrada por el origen de la unidad.
// Sin origen (un ítem de repuesto, que no llega a Gastos) no hay lista a la que llevar.
export function VerTodosEnGastos({
  vista,
  origenId,
}: {
  vista: VistaDeDinero
  origenId: string | null
}) {
  if (origenId === null) return null
  return (
    <Link
      href={rutaDeLaLista({ vista, origenId }) as Route}
      className="text-(--color-ink) underline underline-offset-2"
    >
      Ver todos en Gastos
    </Link>
  )
}
