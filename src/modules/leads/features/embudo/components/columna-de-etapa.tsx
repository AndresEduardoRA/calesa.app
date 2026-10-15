'use client'

import { Button } from '@/shared/ui/button'
import type { EtapaGuardada } from '../../../entities/embudo'
import type { Columna, Tarjeta } from '../../../entities/tablero'
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
  const faltan = total - tarjetas.length
  return (
    <section
      aria-label={`${etapa.nombre}: ${String(total)}`}
      className="grid content-start gap-2 rounded-(--radius-card) bg-(--color-surface-2) p-2"
    >
      {conEncabezado ? (
        <h2 className="flex items-center gap-2 px-1 py-1 text-(length:--text-sm) font-medium text-(--color-ink)">
          <PuntoDeColor color={etapa.color} className="size-2.5" />
          <span className="truncate">{etapa.nombre}</span>
          <span className="ml-auto text-(--color-ink-soft) tabular-nums">{total}</span>
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
      {hayMas && faltan > 0 ? (
        <Button
          variant="outline"
          className="min-h-11 md:min-h-8"
          disabled={cargando}
          onClick={alVerMas}
        >
          {cargando ? 'Cargando…' : `Ver más (${String(faltan)})`}
        </Button>
      ) : null}
    </section>
  )
}
