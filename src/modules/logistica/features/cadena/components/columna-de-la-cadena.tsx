'use client'

import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { enElTope, numeroDeLaColumna, puedeVerMas } from '../../../entities/cadena/columna'
import type { ColumnaDeLaCadena } from '../../../entities/cadena/leer'
import { useSeleccionDeLaCadena } from '../../nucleo/seleccion/use-seleccion-de-la-cadena'
import { BotonElegirLaColumna } from './boton-elegir-la-columna'
import { CasillaDeLaTarjeta } from './casilla-de-la-tarjeta'
import { TarjetaDeLaCadena } from './tarjeta-de-la-cadena'

type Props = {
  columna: ColumnaDeLaCadena
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

/** «12 vehículos», «1 vehículo», «más de 50 vehículos»: lo que lee quien no ve el «50+». */
export function frasePorColumna(columna: ColumnaDeLaCadena): string {
  const n = columna.tarjetas.length
  const cuantos = `${String(n)} ${n === 1 ? 'vehículo' : 'vehículos'}`
  return columna.hayMas ? `más de ${cuantos}` : cuantos
}

function Encabezado({ columna }: { columna: ColumnaDeLaCadena }) {
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
      {columna.activa === false ? (
        <span className="text-(length:--text-xs) font-normal text-(--color-ink-soft)">
          Jubilada
        </span>
      ) : null}
      <span
        aria-label={frasePorColumna(columna)}
        className="ml-auto text-(--color-ink-soft) tabular-nums"
      >
        {numeroDeLaColumna(columna)}
      </span>
    </h2>
  )
}

// Al pie: «Ver más» mientras haya y no se llegue al tope; en el tope, el aviso de siempre con el camino a lo demás (filtrar o buscar el VIN).
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
          texto={`Mostrando las ${String(TOPE_DE_LO_CARGADO)} que llevan más tiempo en la fase.`}
          camino="Afina con los filtros o busca el VIN."
        />
      </div>
    )
  }
  return null
}

// Una fase de la cadena: su nombre sobre su color, cuántas hay (nunca un total exacto), las tarjetas y «Ver más».
export function ColumnaDeLaCadena({
  columna,
  conEncabezado,
  cargando,
  filtrada,
  ahora,
  hrefDe,
  alAbrir,
  alVerMas,
}: Props) {
  // Sin proveedor (quien no puede mover) no hay casillas; la columna «Sin fase» no elige: no tiene destinos comunes.
  const seleccion = useSeleccionDeLaCadena()
  const fase =
    seleccion && columna.faseId !== null
      ? { id: columna.faseId, nombre: columna.nombre ?? '' }
      : null
  const unidades = columna.tarjetas.map((t) => ({ id: t.id, nombre: t.nombre }))
  return (
    <section
      aria-label={`${columna.nombre ?? 'Sin fase'}: ${frasePorColumna(columna)}`}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2 rounded-(--radius-card) bg-(--color-surface-2) p-2"
    >
      {conEncabezado ? <Encabezado columna={columna} /> : null}
      {seleccion && fase && unidades.length > 0 ? (
        <BotonElegirLaColumna
          alElegir={() => {
            seleccion.elegirLaColumna(fase, unidades)
          }}
        />
      ) : null}
      {columna.tarjetas.length === 0 ? (
        <p className="px-1 py-4 text-center text-(length:--text-sm) text-(--color-ink-soft)">
          {filtrada ? 'Ningún vehículo coincide.' : 'Sin vehículos en esta fase.'}
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {columna.tarjetas.map((tarjeta) => (
            <li key={tarjeta.id} className="flex min-w-0 items-start gap-1">
              {seleccion && fase ? (
                <CasillaDeLaTarjeta
                  nombre={tarjeta.nombre}
                  elegida={seleccion.estado.elegidos.has(tarjeta.id)}
                  alAlternar={() => {
                    seleccion.alternar(fase, { id: tarjeta.id, nombre: tarjeta.nombre })
                  }}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <TarjetaDeLaCadena
                  tarjeta={tarjeta}
                  ahora={ahora}
                  href={hrefDe(tarjeta.id)}
                  alAbrir={alAbrir}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pie columna={columna} cargando={cargando} alVerMas={alVerMas} />
    </section>
  )
}
