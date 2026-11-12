import { formatearNumero } from '@/shared/lib/formato'
import { fraccion, textoDeFila } from '../../../entities/graficas'
import { Leyenda } from './leyenda'
import type { Serie } from './tipos'

export type FilaDeRanking = { id: string; nombre: string; a: number; b: number }

type Props = {
  titulo: string
  filas: readonly FilaDeRanking[]
  series: readonly [Serie, Serie]
}

// Un ranking en el orden en que llega (el que manda la RPC): por fila, el nombre, dos barras finas proporcionales al máximo de la
// lista y los dos números escritos. Nunca sólo color.
export function Ranking({ titulo, filas, series }: Props) {
  const [serieA, serieB] = series
  const maximo = Math.max(1, ...filas.flatMap((fila) => [fila.a, fila.b]))
  const totalA = filas.reduce((suma, fila) => suma + fila.a, 0)
  const totalB = filas.reduce((suma, fila) => suma + fila.b, 0)
  return (
    <div className="grid gap-2">
      <Leyenda series={series} />
      <ol aria-label={titulo} className="grid gap-3">
        {filas.map((fila) => (
          <li key={fila.id} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-(length:--text-sm)">
              <span className="truncate font-medium text-(--color-ink)" title={fila.nombre}>
                {fila.nombre}
              </span>
              <span className="shrink-0 text-(--color-ink-soft) tabular-nums">
                {textoDeFila([
                  [serieA.uno, serieA.varios, fila.a],
                  [serieB.uno, serieB.varios, fila.b],
                ])}
              </span>
            </div>
            <svg aria-hidden viewBox="0 0 100 10" preserveAspectRatio="none" className="h-3 w-full">
              <rect x={0} y={0} width={100} height={10} fill="var(--viz-pista)" />
              <rect
                x={0}
                y={0}
                width={fraccion(fila.a, maximo) * 100}
                height={5}
                fill="var(--viz-series-1)"
              />
              <rect
                x={0}
                y={5}
                width={fraccion(fila.b, maximo) * 100}
                height={5}
                fill="var(--viz-series-2)"
              />
            </svg>
          </li>
        ))}
      </ol>
      <p className="sr-only">
        En total, {formatearNumero(totalA)} {serieA.nombre.toLowerCase()} y{' '}
        {formatearNumero(totalB)} {serieB.nombre.toLowerCase()}.
      </p>
    </div>
  )
}
