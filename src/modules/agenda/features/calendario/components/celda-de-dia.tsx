import type { Route } from 'next'
import Link from 'next/link'
import { numeroDelDia } from '../../../entities/calendario'
import type { EntradaDeAgenda } from '../../../entities/agenda'
import { enlaceDeDia } from '../enlace-de-dia'
import { ChipEvento } from './chip-de-agenda'

type Props = {
  dia: string
  entradas: readonly EntradaDeAgenda[]
  zona: string
  hoy: string
  // Un día de otro mes (en la grilla del mes) va atenuado.
  delMes?: boolean
  // Cuántos chips caben; el resto dice «+N más» y lleva al día. Sin tope en la semana.
  maximo?: number
  // Alguna clase llegó a su tope: el «+N» cuenta lo cargado, no el total.
  hayMas: boolean
  extra: string
}

// Una celda de la grilla (mes o semana): el número del día, hasta `maximo` chips y «+N más».
export function CeldaDeDia({
  dia,
  entradas,
  zona,
  hoy,
  delMes = true,
  maximo,
  hayMas,
  extra,
}: Props) {
  const visibles = maximo === undefined ? entradas : entradas.slice(0, maximo)
  const sobran = entradas.length - visibles.length
  return (
    <div
      className={`grid min-w-0 content-start gap-1 rounded-md border border-(--color-line) p-1.5 ${
        delMes ? 'bg-(--color-surface)' : 'bg-(--color-paper-dim) opacity-70'
      }`}
    >
      <p className="text-(length:--text-sm) font-medium text-(--color-ink) tabular-nums">
        <Link href={enlaceDeDia(extra, dia) as Route} className="hover:underline">
          {numeroDelDia(dia)}
        </Link>
        {dia === hoy ? <span className="ml-1 text-(--color-primario-ink)">Hoy</span> : null}
      </p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {visibles.map((entrada) => (
          <li key={`${entrada.clave}-${entrada.id}`} className="min-w-0">
            <ChipEvento entrada={entrada} zona={zona} />
          </li>
        ))}
      </ul>
      {sobran > 0 ? (
        <Link
          href={enlaceDeDia(extra, dia) as Route}
          className="text-(length:--text-sm) text-(--color-ink-soft) hover:underline"
        >
          +{sobran}
          {hayMas ? '+' : ''} más
        </Link>
      ) : null}
    </div>
  )
}
