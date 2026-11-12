import type { Serie } from './tipos'

// La leyenda va siempre en texto: el cuadrito de color acompaña al nombre, nunca lo reemplaza.
export function Leyenda({ series }: { series: readonly [Serie, Serie] }) {
  const colores = ['var(--viz-series-1)', 'var(--viz-series-2)']
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      {series.map((serie, indice) => (
        <li key={serie.nombre} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: colores[indice] }}
          />
          {serie.nombre}
        </li>
      ))}
    </ul>
  )
}
