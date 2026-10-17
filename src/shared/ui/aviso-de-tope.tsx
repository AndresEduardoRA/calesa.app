import type { ReactNode } from 'react'

type Props = {
  // «Mostrando los 50 más recientes.»: lo que se ve y en qué orden.
  texto: string
  // El camino a lo que no se ve, si lo hay («Escribe más para afinar la búsqueda.», un botón).
  camino?: ReactNode
}

// Una lista que llegó a su tope lo dice al pie, siempre con el mismo texto y en el mismo lugar (cierre 1; ver
// `.claude/rules/escala.md`): las listas de un lead, el kanban, los vínculos de un vehículo, el selector de vehículos y el
// historial de tipos de cambio. La lectura pide uno de más (`cortarAlTope()`) para saber si lo hay.
export function AvisoDeTope({ texto, camino }: Props) {
  return (
    <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
      {texto}
      {camino ? <> {camino}</> : null}
    </p>
  )
}
