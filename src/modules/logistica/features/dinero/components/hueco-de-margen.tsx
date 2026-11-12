'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  SIN_GASTOS_REGISTRADOS,
  SIN_PERMISO_DE_MARGEN,
  textosDelMargen,
  type Margen,
} from '../../../entities/dinero/margen'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useMargen } from '../hooks/use-margen'

function Cifras({ margen }: { margen: Margen }) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
      {textosDelMargen(margen).map((cifra) => (
        <div key={cifra.clave} className="grid min-w-0 gap-0.5" data-cifra={cifra.clave}>
          <dt className="text-(length:--text-sm) text-(--color-ink-soft)">{cifra.etiqueta}</dt>
          <dd className="font-medium break-words">
            {cifra.monto === null ? (
              <span className="text-(--color-ink-soft)">{cifra.sinDato}</span>
            ) : (
              <Monto valor={cifra.monto} />
            )}
            {cifra.nota ? (
              <span className="ml-2 text-(length:--text-sm) font-normal text-(--color-ink-soft)">
                {cifra.nota}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function RealPorCategoria({ margen }: { margen: Margen }) {
  return (
    <section className="grid gap-1.5" aria-label="Real por categoría">
      <h3 className="text-(length:--text-sm) font-medium">Real por categoría</h3>
      {margen.porCategoria.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_GASTOS_REGISTRADOS}</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {margen.porCategoria.map((c) => (
            <li
              key={c.categoriaId}
              className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 text-(length:--text-sm)"
            >
              <span className="min-w-0 break-words">{c.nombre}</span>
              <Monto valor={c.real} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// El hueco «Margen» del panel de la unidad (6.11-1): cotizado (la final), real, desviación, venta y margen, y debajo el real por categoría. Lo que la base no tiene se escribe «Sin cotización
// final» o «Sin venta registrada», nunca 0. Sólo se dibuja con `logistica.margen.ver` en el origen; vuelve a leer cuando el hueco «Gastos» guarda o elimina.
export function HuecoDeMargen({ unidad }: { unidad: Unidad }) {
  const { lectura, reintentar } = useMargen(unidad.id)
  if (lectura.tipo === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando el margen" className="grid gap-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    )
  }
  if (lectura.tipo === 'error') {
    return (
      <div className="grid gap-2">
        <Aviso tono={lectura.error.codigo === 'sin_permiso' ? 'info' : 'peligro'}>
          <p>
            {lectura.error.codigo === 'sin_permiso' ? SIN_PERMISO_DE_MARGEN : lectura.error.mensaje}
          </p>
        </Aviso>
        {lectura.error.codigo === 'sin_permiso' ? null : (
          <div>
            <Button variant="outline" onClick={reintentar}>
              Reintentar
            </Button>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="grid gap-4" data-hueco="margen" data-estado="listo">
      <Cifras margen={lectura.dato} />
      <RealPorCategoria margen={lectura.dato} />
    </div>
  )
}
