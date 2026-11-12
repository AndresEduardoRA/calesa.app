'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFecha } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { useRegional } from '@/shared/ui/regional'
import { diasEnLaFase } from '../../../entities/nucleo/dias-en-la-fase'
import type { ResultadoDeDondeEsta, UnidadDondeEsta } from '../../../entities/cadena/leer'

type Props = {
  // Lo que encontró «dónde está» para la búsqueda `q` (en todos los orígenes de la persona), o `null` si no se pudo comprobar.
  resultado: ResultadoDeDondeEsta | null
  q: string
  ahora: Date
}

function cuantoHace(faseDesde: string | null, ahora: Date): string | null {
  const dias = diasEnLaFase(faseDesde, ahora)
  if (dias === null) return null
  if (dias === 0) return 'desde hoy'
  return `hace ${String(dias)} ${dias === 1 ? 'día' : 'días'}`
}

// «<título> · en «<fase>» hace 3 días · ETA <fecha>»: la fase es la que la base dice; sin fase, «Sin fase».
function Linea({ unidad, ahora }: { unidad: UnidadDondeEsta; ahora: Date }) {
  const { zonaHoraria } = useRegional()
  const hace = cuantoHace(unidad.faseDesde, ahora)
  const partes = [
    unidad.titulo,
    unidad.faseId === null || unidad.faseNombre === null
      ? 'Sin fase'
      : `en «${unidad.faseNombre}»${hace ? ` ${hace}` : ''}`,
    unidad.etaEl ? `ETA ${formatearFecha(unidad.etaEl, { zona: zonaHoraria })}` : null,
  ].filter((parte) => parte !== null)
  return <>{partes.join(' · ')}</>
}

function cuantas(n: number): string {
  return n === 1 ? 'Encontré 1 vehículo.' : `Encontré ${String(n)} vehículos.`
}

// Sobre las columnas, cuando se busca: dónde está cada unidad que coincide, **de todos tus orígenes** (las columnas son sólo las del origen de la pestaña). Cada fila lleva a su origen con la
// búsqueda y el panel abiertos. No se dibuja con una búsqueda corta; si no se pudo comprobar, lo dice sin tumbar el tablero.
export function FranjaDeDondeEsta({ resultado, q, ahora }: Props) {
  if (resultado === null) {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        No se pudo comprobar dónde está.
      </p>
    )
  }
  return (
    <section
      aria-label="Dónde está"
      className="grid gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <h2 className="text-(length:--text-sm) font-medium text-(--color-ink)">Dónde está</h2>
      <p role="status" className="sr-only">
        {resultado.unidades.length === 0
          ? 'Ninguno de tus vehículos coincide.'
          : cuantas(resultado.unidades.length)}
      </p>
      {resultado.unidades.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Ninguno de tus vehículos coincide.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {resultado.unidades.map((unidad) => (
            <li key={unidad.id} className="min-w-0">
              <Link
                href={
                  `${RUTAS.logistica}?origen=${unidad.origenId}&q=${encodeURIComponent(q)}&vehiculo=${unidad.id}` as Route
                }
                prefetch={false}
                className="flex min-h-11 items-center rounded-(--radius-input) text-(length:--text-sm) break-words text-(--color-ink) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-8"
              >
                <Linea unidad={unidad} ahora={ahora} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {resultado.hayMas ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Hay más: escribe más para afinar.
        </p>
      ) : null}
    </section>
  )
}
