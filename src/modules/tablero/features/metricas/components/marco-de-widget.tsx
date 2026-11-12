import type { ReactNode } from 'react'
import type { WidgetDelCatalogo } from '../../../entities/widgets'

// La `<section>` y el título de un widget. Se ven mientras el cuerpo carga o falla.
export function MarcoDeWidget({
  widget,
  children,
}: {
  widget: WidgetDelCatalogo
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={`tablero-${widget.clave}`}
      className={`flex flex-col rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) ${
        widget.tamano === 'ancho' ? 'sm:col-span-2 xl:col-span-3' : ''
      }`}
    >
      <h2
        id={`tablero-${widget.clave}`}
        className="border-b border-(--color-line) px-4 py-3 text-(length:--text-base) font-medium text-(--color-ink)"
      >
        {widget.titulo}
      </h2>
      {children}
    </section>
  )
}
