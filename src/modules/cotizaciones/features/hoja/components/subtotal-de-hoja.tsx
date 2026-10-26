import type { SubtotalDeHoja as Subtotal } from '../../../entities/hoja'
import { ValorDeNodo } from './valor-de-nodo'

// Un subtotal: una franja con su etiqueta y su valor (el «CIF» de «Avanzado»), con el tono de su grupo. No se edita.
export function SubtotalDeHoja({ item, valor }: { item: Subtotal; valor: number | null }) {
  return (
    <div
      data-tono={item.tono ?? undefined}
      className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 rounded-(--radius-md) border border-[color:var(--tono-borde,var(--color-line-strong))] bg-[color:var(--tono-fondo,var(--color-surface-2))] px-3 py-2 text-(length:--text-sm) font-medium text-[color:var(--tono-tinta,var(--color-ink))]"
    >
      <span className="min-w-0 [overflow-wrap:anywhere]">{item.etiqueta}</span>
      <ValorDeNodo valor={valor} formato={item.formato} />
    </div>
  )
}
