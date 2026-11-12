import type { Route } from 'next'
import Link from 'next/link'
import { rutaDeLaLista, type VistaDeDinero } from '../../../entities/dinero/listas'

// El camino a lo que el tope del hueco no muestra (`.claude/rules/escala.md`): la lista de `/logistica/gastos` de esa vista, ya filtrada por el origen de la unidad.
export function VerTodosEnGastos({ vista, origenId }: { vista: VistaDeDinero; origenId: string }) {
  return (
    <Link
      href={rutaDeLaLista({ vista, origenId }) as Route}
      className="text-(--color-ink) underline underline-offset-2"
    >
      Ver todos en Gastos
    </Link>
  )
}
