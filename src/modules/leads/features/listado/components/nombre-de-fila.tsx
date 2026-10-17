import { cn } from 'cn'
import type { Etiqueta } from '../../../entities/etiqueta'
import type { FilaDeLead } from '../../../entities/listado'
import { InsigniasDeMarcas } from '../../marcas/components/insignias-de-marcas'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'

// El nombre de un lead en la lista, atenuado y tachado si quien mira lo tachó (la insignia
// «Tachado» lo dice con texto), con su número y sus marcas debajo.
export function NombreDeFila({
  lead,
  etiquetas,
  nombre,
}: {
  lead: FilaDeLead
  etiquetas: readonly Etiqueta[]
  // El nombre ya envuelto (un botón en la tabla, texto en la tarjeta).
  nombre: (clases: string) => React.ReactNode
}) {
  const tachado = lead.marcas.estaTachado
  return (
    <span className="grid min-w-0 gap-0.5">
      {nombre(
        cn(
          'truncate font-medium text-(--color-ink)',
          tachado && 'text-(--color-ink-soft) line-through decoration-(--color-ink-faint)',
        ),
      )}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <NumeroDeLead
          numeros={lead.numeros}
          className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
        />
        <InsigniasDeMarcas marcas={lead.marcas} etiquetas={etiquetas} />
      </span>
    </span>
  )
}
