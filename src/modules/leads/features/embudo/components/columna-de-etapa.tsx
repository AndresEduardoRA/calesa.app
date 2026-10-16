'use client'

import { conteoCorto, conteoEnFrase } from '@/shared/lib/conteo'
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
}: Props) {
  const { etapa, total, tarjetas, hayMas } = columna
  const { locale } = useRegional()
  const enElTope = columnaEnElTope(columna)
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
          Sin oportunidades en esta etapa.
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
      {hayMas && !enElTope && (faltan === null || faltan > 0) ? (
        <Button
          variant="outline"
          className="min-h-11 md:min-h-8"
          disabled={cargando}
          onClick={alVerMas}
        >
          {cargando ? 'Cargando…' : faltan === null ? 'Ver más' : `Ver más (${String(faltan)})`}
        </Button>
      ) : null}
      {hayMas && enElTope ? (
        <p role="status" className="px-1 py-2 text-(length:--text-sm) text-(--color-ink-soft)">
          Mostrando las {TOPE_DE_COLUMNA} con actividad más reciente. Las demás siguen en la ficha
          de cada lead.
        </p>
      ) : null}
    </section>
  )
}
