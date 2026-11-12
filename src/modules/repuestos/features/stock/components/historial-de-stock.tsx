'use client'

import { formatearFechaHora } from '@/shared/lib/fechas'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  cantidadConSigno,
  textoDelMovimiento,
  type MovimientoDeStock,
} from '../../../entities/stock/movimientos'
import { useHistorialDeStock } from '../hooks/use-historial-de-stock'

type Props = { itemId: string; revision: number }

function Movimiento({ m, zona }: { m: MovimientoDeStock; zona: string }) {
  return (
    <li className="grid min-w-0 gap-0.5 border-b border-(--color-line) py-2 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-medium">{textoDelMovimiento(m.motivo)}</span>
        <span className="tabular-nums">{cantidadConSigno(m.cantidad)}</span>
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {formatearFechaHora(m.creadoEn, { zona })} · {m.quien ?? '—'}
      </p>
      {m.nota ? <p className="text-(length:--text-sm) break-words">{m.nota}</p> : null}
    </li>
  )
}

function Cargando() {
  return (
    <div role="status" aria-label="Cargando los movimientos" className="grid gap-2">
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
    </div>
  )
}

function ErrorConReintentar({
  mensaje,
  alReintentar,
}: {
  mensaje: string
  alReintentar: () => void
}) {
  return (
    <div className="grid gap-2">
      <Aviso tono="peligro">
        <p>{mensaje}</p>
      </Aviso>
      <Button type="button" variant="outline" onClick={alReintentar}>
        Reintentar
      </Button>
    </div>
  )
}

type Historial = ReturnType<typeof useHistorialDeStock>

function Lista({ h, zona }: { h: Historial & { movimientos: MovimientoDeStock[] }; zona: string }) {
  if (h.movimientos.length === 0 && h.error === null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Este ítem aún no tiene movimientos de stock.
      </p>
    )
  }
  return (
    <>
      {h.movimientos.length > 0 ? (
        <ol className="grid grid-cols-[minmax(0,1fr)]">
          {h.movimientos.map((m) => (
            <Movimiento key={m.id} m={m} zona={zona} />
          ))}
        </ol>
      ) : null}
      {h.error ? (
        <ErrorConReintentar mensaje={h.error.mensaje} alReintentar={h.reintentar} />
      ) : null}
      {h.hayMasParaPedir && h.error === null ? (
        <Button type="button" variant="outline" disabled={h.pidiendo} onClick={h.verMas}>
          Ver más
        </Button>
      ) : null}
      {h.enElTope ? <AvisoDeTope texto="Mostrando los 500 movimientos más recientes." /> : null}
    </>
  )
}

// Los movimientos de stock del ítem, del más nuevo al más viejo (8.10-2, C12): cargando, error con «Reintentar», vacío y la lista con «Ver más» hasta el tope (D9).
export function HistorialDeStock({ itemId, revision }: Props) {
  const { zonaHoraria } = useRegional()
  const h = useHistorialDeStock(itemId, revision)
  const { movimientos } = h
  let cuerpo
  if (movimientos !== null) {
    cuerpo = <Lista h={{ ...h, movimientos }} zona={zonaHoraria} />
  } else if (h.error) {
    cuerpo = <ErrorConReintentar mensaje={h.error.mensaje} alReintentar={h.reintentar} />
  } else {
    cuerpo = <Cargando />
  }
  return (
    <section aria-labelledby={`movimientos-${itemId}`} className="grid gap-2">
      <h3 id={`movimientos-${itemId}`} className="font-medium">
        Movimientos
      </h3>
      {cuerpo}
    </section>
  )
}
