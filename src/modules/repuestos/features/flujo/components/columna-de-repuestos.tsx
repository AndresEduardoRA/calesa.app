'use client'

import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import {
  enElTope,
  frasePorColumna,
  numeroDeLaColumna,
  puedeVerMas,
  type ColumnaDeRepuestos as Columna,
} from '../../../entities/flujo/cadena'
import { TarjetaDeRepuesto } from './tarjeta-de-repuesto'

type Props = {
  columna: Columna
  // En el celular la columna no repite su encabezado (lo dice la pestaña).
  conEncabezado: boolean
  cargando: boolean
  // Hay filtros puestos: el vacío dice que nada coincide.
  filtrada: boolean
  ahora: Date
  hrefDe: (id: string) => string
  alAbrir: (id: string) => void
  alVerMas: () => void
}

function Encabezado({ columna }: { columna: Columna }) {
  return (
    <h2 className="flex items-center gap-2 px-1 py-1 text-(length:--text-sm) font-medium text-(--color-ink)">
      <span className="inline-flex h-5 min-w-0 items-center gap-1.5 rounded-(--radius-pill) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-xs) font-medium text-(--color-ink)">
        {columna.color ? (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: columna.color }}
          />
        ) : null}
        <span className="truncate">{columna.nombre ?? 'Sin fase'}</span>
      </span>
      {columna.activa ? null : (
        <span className="text-(length:--text-xs) font-normal text-(--color-ink-soft)">
          Jubilada
        </span>
      )}
      <span
        aria-label={frasePorColumna(columna)}
        className="ml-auto text-(--color-ink-soft) tabular-nums"
      >
        {numeroDeLaColumna(columna)}
      </span>
    </h2>
  )
}

// Al pie: «Ver más» mientras haya y no se llegue al tope; en el tope, el aviso de siempre con el camino a lo demás (buscar).
function Pie({ columna, cargando, alVerMas }: Pick<Props, 'columna' | 'cargando' | 'alVerMas'>) {
  if (puedeVerMas(columna)) {
    return (
      <Button
        variant="outline"
        className="min-h-11 md:min-h-8"
        disabled={cargando}
        onClick={alVerMas}
      >
        {cargando ? 'Cargando…' : 'Ver más'}
      </Button>
    )
  }
  if (enElTope(columna)) {
    return (
      <div className="px-1 py-2">
        <AvisoDeTope
          texto={`Mostrando las ${String(TOPE_DE_LO_CARGADO)} ${columna.esFinal ? 'más recientes' : 'que llevan más tiempo en la fase'}.`}
          camino="Afina con la búsqueda."
        />
      </div>
    )
  }
  return null
}

// Una fase de la Cadena de repuestos (8.13-3): su nombre sobre su color, cuántos hay (nunca un total exacto), las tarjetas y «Ver más».
export function ColumnaDeRepuestos({
  columna,
  conEncabezado,
  cargando,
  filtrada,
  ahora,
  hrefDe,
  alAbrir,
  alVerMas,
}: Props) {
  return (
    <section
      aria-label={`${columna.nombre ?? 'Sin fase'}: ${frasePorColumna(columna)}`}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2 rounded-(--radius-card) bg-(--color-surface-2) p-2"
    >
      {conEncabezado ? <Encabezado columna={columna} /> : null}
      {columna.tarjetas.length === 0 ? (
        <p className="px-1 py-4 text-center text-(length:--text-sm) text-(--color-ink-soft)">
          {filtrada ? 'Ningún repuesto coincide.' : 'Sin repuestos en esta fase.'}
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {columna.tarjetas.map((tarjeta) => (
            <li key={tarjeta.id} className="min-w-0">
              <TarjetaDeRepuesto
                tarjeta={tarjeta}
                ahora={ahora}
                href={hrefDe(tarjeta.id)}
                alAbrir={alAbrir}
              />
            </li>
          ))}
        </ul>
      )}
      <Pie columna={columna} cargando={cargando} alVerMas={alVerMas} />
    </section>
  )
}
