'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { EstadoError } from '@/shared/ui/estados'
import {
  encabezadoDeLasEsperas,
  fraseDeUnaEspera,
  type EsperaDeItem,
} from '../../../entities/flujo/esperas'
import { useEsperasDelVehiculo } from '../hooks/use-esperas-del-vehiculo'

type Props = { unidad: { id: string; faseId: string | null } }

function ItemQueEspera({ item }: { item: EsperaDeItem }) {
  const frases = item.esperas.map(fraseDeUnaEspera).filter((f) => f !== null)
  return (
    <li className="grid min-w-0 gap-0.5 border-b border-(--color-line) py-2 last:border-b-0">
      <Link
        href={`${RUTAS.repuestos}/${item.proyectoId}?item=${item.itemId}` as Route}
        prefetch={false}
        className="inline-flex min-h-11 items-center text-(length:--text-sm) font-medium break-words text-(--color-ink) underline-offset-2 hover:underline md:min-h-0"
      >
        {item.descripcion}
      </Link>
      <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
        Proyecto #{item.proyectoNumero}
        {item.faseNombre ? ` · ${item.faseNombre}` : ''}
      </p>
      {[...new Set(frases)].map((frase) => (
        <p key={frase} className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
          {frase}
        </p>
      ))}
    </li>
  )
}

// El hueco «Repuestos» del panel del vehículo (8.13-3): los ítems de repuesto que una espera de su flujo aguarda. Sólo explica: lo que bloquea al vehículo lo decide la base (`evaluar_requisitos`) y
// aquí no se mueve nada; cada ítem lleva a su panel, donde quien tiene `repuestos.mover` lo pasa de fase.
export function HuecoDeEsperas({ unidad }: Props) {
  const { lectura, reintentar } = useEsperasDelVehiculo(unidad)
  if (lectura.estado === 'leyendo') {
    return (
      <p role="status" aria-busy="true" className="text-(length:--text-sm) text-(--color-ink-soft)">
        Cargando…
      </p>
    )
  }
  if (lectura.estado === 'fallo') {
    return (
      <EstadoError compacto alReintentar={reintentar} titulo="No se pudieron leer los repuestos" />
    )
  }
  const esperas = lectura.dato
  return (
    <div className="grid min-w-0 gap-1">
      <p className="text-(length:--text-sm) text-(--color-ink)">
        {encabezadoDeLasEsperas(esperas)}
      </p>
      {esperas.items.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)]">
          {esperas.items.map((item) => (
            <ItemQueEspera key={item.itemId} item={item} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
