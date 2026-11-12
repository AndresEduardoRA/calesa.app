import { formatearDiaYMes } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { fraccion, marcasDeDias, techoDeEscala, textoDeBarra } from '../../../entities/graficas'
import { Leyenda } from './leyenda'
import type { Serie } from './tipos'

export type DiaDeLaGrafica = { dia: string; a: number; b: number }

type Props = {
  titulo: string
  dias: readonly DiaDeLaGrafica[]
  series: readonly [Serie, Serie]
}

// Ancho de cada día en el `viewBox`: una barra por serie y un hueco.
const ANCHO_DEL_DIA = 3

// Barras por día con dos series. Es HTML y SVG de servidor: el texto (leyenda, techo del eje, fechas) es HTML y el SVG sólo pinta
// las barras, estirado al ancho de la tarjeta. Los números día por día están en la tabla equivalente.
export function BarrasPorDia({ titulo, dias, series }: Props) {
  const [serieA, serieB] = series
  const totalA = dias.reduce((suma, d) => suma + d.a, 0)
  const totalB = dias.reduce((suma, d) => suma + d.b, 0)
  const techo = techoDeEscala(Math.max(0, ...dias.map((d) => Math.max(d.a, d.b))))
  const marcas = marcasDeDias(dias.map((d) => d.dia))
  const resumen = `${titulo}: ${formatearNumero(totalA)} ${serieA.nombre.toLowerCase()} y ${formatearNumero(totalB)} ${serieB.nombre.toLowerCase()} en el período`

  return (
    <div role="img" aria-label={resumen} className="grid gap-2">
      <Leyenda series={series} />
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <div
          aria-hidden
          className="flex h-40 flex-col justify-between text-(length:--text-xs) text-(--color-ink-faint) tabular-nums"
        >
          <span>{formatearNumero(techo)}</span>
          <span>0</span>
        </div>
        <svg
          aria-hidden
          viewBox={`0 0 ${dias.length * ANCHO_DEL_DIA} 100`}
          preserveAspectRatio="none"
          className="h-40 w-full"
        >
          {[0, 50, 100].map((y) => (
            <line
              key={y}
              x1={0}
              x2={dias.length * ANCHO_DEL_DIA}
              y1={y}
              y2={y}
              stroke="var(--viz-grilla)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {dias.map((d, indice) => {
            const x = indice * ANCHO_DEL_DIA
            const altoA = fraccion(d.a, techo) * 100
            const altoB = fraccion(d.b, techo) * 100
            return (
              <g key={d.dia}>
                <title>
                  {textoDeBarra(d.dia, [
                    [serieA.uno, serieA.varios, d.a],
                    [serieB.uno, serieB.varios, d.b],
                  ])}
                </title>
                <rect x={x} y={100 - altoA} width={1} height={altoA} fill="var(--viz-series-1)" />
                <rect
                  x={x + 1}
                  y={100 - altoB}
                  width={1}
                  height={altoB}
                  fill="var(--viz-series-2)"
                />
              </g>
            )
          })}
        </svg>
        <span aria-hidden />
        <div
          aria-hidden
          className="flex justify-between text-(length:--text-xs) text-(--color-ink-faint) tabular-nums"
        >
          {marcas.map((indice) => (
            <span key={indice}>{formatearDiaYMes(dias[indice]?.dia ?? '')}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
