'use client'

import { conteoCorto, conteoEnFrase } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { EtapaGuardada } from '../../../entities/embudo'
import {
  TOPE_DE_COLUMNA,
  columnaEnElTope,
  type Columna,
  type Tarjeta,
} from '../../../entities/tablero'
import { PuntoDeColor } from '../../etiquetas/components/insignia-de-etiqueta'
import { TarjetaDeOportunidad } from './tarjeta-de-oportunidad'

type Props = {
  columna: Columna
  etapas: readonly EtapaGuardada[]
  moviendo: string | null
  cargando: boolean
  // En el celular la columna no repite su encabezado (lo dice la pestaña).
  conEncabezado: boolean
  alMover: (tarjeta: Tarjeta, etapaId: string, motivo: string | null) => Promise<boolean>
  alVerMas: () => void
  // Hay una búsqueda puesta (cierre 1): el vacío dice que nada coincide.
  buscando?: boolean
  // Lleva el foco a la búsqueda: el camino a lo que pasa del tope.
  alIrABuscar?: () => void
}

// Al pie de una columna: «Ver más» mientras haya y no se llegue al tope; en el tope, el aviso de siempre y el camino a las
// demás, que es buscar (cierre 1: antes era «las demás siguen en la ficha de cada lead»).
function PieDeLaColumna(props: {
  columna: Columna
  faltan: number | null
  cargando: boolean
  buscando: boolean
  alVerMas: () => void
  alIrABuscar: (() => void) | undefined
}) {
  const { columna, faltan, cargando, alVerMas } = props
  const enElTope = columnaEnElTope(columna)
  if (columna.hayMas && !enElTope && (faltan === null || faltan > 0)) {
    return (
      <Button
        variant="outline"
        className="min-h-11 md:min-h-8"
        disabled={cargando}
        onClick={alVerMas}
      >
        {cargando ? 'Cargando…' : faltan === null ? 'Ver más' : `Ver más (${String(faltan)})`}
      </Button>
    )
  }
  if (!columna.hayMas || !enElTope) {
    return null
  }
  return (
    <div className="grid gap-1 px-1 py-2">
      <AvisoDeTope
        texto={`Mostrando las ${String(TOPE_DE_COLUMNA)} con actividad más reciente.`}
        camino={
          props.buscando
            ? 'Afina la búsqueda para llegar a las demás.'
            : 'Busca para llegar a las demás.'
        }
      />
      {props.alIrABuscar && !props.buscando ? (
        <Button variant="outline" className="min-h-11 w-fit md:min-h-8" onClick={props.alIrABuscar}>
          Buscar en el embudo
        </Button>
      ) : null}
    </div>
  )
}

// Una etapa del embudo: su nombre (sobre su color), cuántas hay, las tarjetas y «Ver más».
export function ColumnaDeEtapa({
  columna,
  etapas,
  moviendo,
  cargando,
  conEncabezado,
  alMover,
  alVerMas,
  buscando = false,
  alIrABuscar,
}: Props) {
  const { etapa, total, tarjetas } = columna
  const { locale } = useRegional()
  // Cuántas faltan sólo se sabe mientras el total no pasó el tope.
  const faltan = total.hayMas ? null : total.n - tarjetas.length
  return (
    <section
      aria-label={`${etapa.nombre}: ${conteoEnFrase(total, { locale })}`}
      className="grid content-start gap-2 rounded-(--radius-card) bg-(--color-surface-2) p-2"
    >
      {conEncabezado ? (
        <h2 className="flex items-center gap-2 px-1 py-1 text-(length:--text-sm) font-medium text-(--color-ink)">
          <PuntoDeColor color={etapa.color} className="size-2.5" />
          <span className="truncate">{etapa.nombre}</span>
          <span className="ml-auto text-(--color-ink-soft) tabular-nums">
            {conteoCorto(total, { locale })}
          </span>
        </h2>
      ) : null}
      {tarjetas.length === 0 ? (
        <p className="px-1 py-4 text-center text-(length:--text-sm) text-(--color-ink-soft)">
          {buscando ? 'Nada coincide en esta etapa.' : 'Sin oportunidades en esta etapa.'}
        </p>
      ) : (
        <ul className="grid gap-2">
          {tarjetas.map((tarjeta) => (
            <li key={tarjeta.id}>
              <TarjetaDeOportunidad
                tarjeta={tarjeta}
                etapas={etapas}
                enCurso={moviendo === tarjeta.id}
                alMover={(etapaId, motivo) => alMover(tarjeta, etapaId, motivo)}
              />
            </li>
          ))}
        </ul>
      )}
      <PieDeLaColumna
        columna={columna}
        faltan={faltan}
        cargando={cargando}
        buscando={buscando}
        alVerMas={alVerMas}
        alIrABuscar={alIrABuscar}
      />
    </section>
  )
}
