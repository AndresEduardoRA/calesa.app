import type { ReactNode } from 'react'
import type { BloqueBandeja } from '../../../entities/bandeja'

// La `<section>` y el título de un bloque. Se ven mientras el cuerpo carga o falla.
export function MarcoDeBloque({
  bloque,
  children,
}: {
  bloque: BloqueBandeja
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={`bandeja-${bloque.clave}`}
      className="flex flex-col rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)"
    >
      <h2
        id={`bandeja-${bloque.clave}`}
        className="border-b border-(--color-line) px-4 py-3 text-(length:--text-base) font-medium text-(--color-ink)"
      >
        {bloque.titulo}
      </h2>
      {children}
    </section>
  )
}
