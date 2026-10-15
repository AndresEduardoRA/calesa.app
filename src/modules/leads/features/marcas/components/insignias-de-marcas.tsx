import { StarIcon } from 'lucide-react'
import { cn } from 'cn'
import { etiquetasDelLead, type Etiqueta } from '../../../entities/etiqueta'
import {
  ETIQUETA_DE_FAVORITO,
  ETIQUETA_DE_TACHADO,
  type MarcasDeLead,
} from '../../../entities/marcas'
import { InsigniaDeEtiqueta } from '../../etiquetas/components/insignia-de-etiqueta'

type Props = {
  marcas: MarcasDeLead
  // Todas las de quien mira: de ahí salen el nombre y el color de las del lead.
  etiquetas: readonly Etiqueta[]
  // En la ficha la estrella ya es un botón: no se repite.
  conFavorito?: boolean
  className?: string
}

// Lo que quien mira marcó en el lead, dicho con texto: «Favorito», «Tachado» y sus etiquetas. Nada
// de esto lo ve otra persona. Sin marcas no dibuja nada.
export function InsigniasDeMarcas({ marcas, etiquetas, conFavorito = true, className }: Props) {
  const delLead = etiquetasDelLead(marcas.etiquetas, etiquetas)
  const favorito = conFavorito && marcas.esFavorito
  if (!favorito && !marcas.estaTachado && delLead.length === 0) {
    return null
  }
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {favorito ? (
        <span className="inline-flex h-5 items-center gap-1 text-(length:--text-xs) text-(--color-aviso-ink)">
          <StarIcon aria-hidden className="size-3.5 fill-current" />
          <span className="sr-only">{ETIQUETA_DE_FAVORITO}</span>
        </span>
      ) : null}
      {marcas.estaTachado ? (
        <span className="inline-flex h-5 items-center rounded-(--radius-pill) border border-(--color-line-strong) px-2 text-(length:--text-xs) font-medium text-(--color-ink-soft)">
          {ETIQUETA_DE_TACHADO}
        </span>
      ) : null}
      {delLead.map((etiqueta) => (
        <InsigniaDeEtiqueta key={etiqueta.id} etiqueta={etiqueta} />
      ))}
    </span>
  )
}
