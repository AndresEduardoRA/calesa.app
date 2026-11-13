'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { CLAVE_DE_CURSOR, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { FilterShell } from '@/shared/ui/filtros'
import {
  CLAVE_DE_PROYECTO_DE_LA_CADENA,
  cadenaFiltrada,
  type CadenaDeRepuestos,
  type FiltrosDeLaCadena,
} from '../../../entities/flujo/cadena'
import { CLAVE_DE_ITEM_DEL_PANEL } from '../../../entities/flujo/paneles'
import { useCadenaDeRepuestos } from '../hooks/use-cadena-de-repuestos'
import { useItemPorUrl } from '../hooks/use-item-por-url'
import {
  CadenaSinFases,
  CadenaSinRepuestos,
  SinResultadosDeLaCadena,
} from './estado-de-la-cadena-de-repuestos'
import { TableroDeRepuestos } from './tablero-de-repuestos'

type Props = {
  cadena: CadenaDeRepuestos
  // Lo que filtra la URL, ya reducido (`pedidoDeLaCadena`).
  filtros: FiltrosDeLaCadena
  esquema: EsquemaDeFiltros
  // El instante de la lectura, ISO (lo toma el servidor).
  ahora: string
  // La persona puede configurar flujos: «el flujo todavía no tiene fases» lleva ahí.
  enlaceAFlujos: boolean
}

// «Mostrando un solo proyecto» con «Ver todos», que lo quita de la URL (el filtro de proyecto no tiene control propio: viene de «Ver todas» de Inicio y de los enlaces de proyecto).
function AvisoDelProyecto({ hrefSinProyecto }: { hrefSinProyecto: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Mostrando un solo proyecto.</span>
      <Link
        href={hrefSinProyecto as Route}
        className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-8' })}
      >
        Ver todos
      </Link>
    </p>
  )
}

// La Cadena de repuestos (8.13-3): la búsqueda arriba y las columnas por fase. Abrir una tarjeta pone `?item=` y lo abre el panel de `src/app` (el mismo de la hoja, parte 2).
export function CadenaDeRepuestos({ cadena, filtros, esquema, ahora, enlaceAFlujos }: Props) {
  const estado = useCadenaDeRepuestos(cadena, filtros)
  const item = useItemPorUrl()
  const ruta = usePathname()
  const parametros = useSearchParams()
  const instante = useMemo(() => new Date(ahora), [ahora])
  const filtrada = cadenaFiltrada(filtros)
  // La URL de ahora sin lo que no se hereda: ni el panel abierto, ni la página.
  const resto = useMemo(() => {
    const otros = new URLSearchParams(parametros)
    otros.delete(CLAVE_DE_ITEM_DEL_PANEL)
    otros.delete(CLAVE_DE_CURSOR)
    return otros
  }, [parametros])
  const hrefDe = (id: string) => {
    const con = new URLSearchParams(resto)
    con.set(CLAVE_DE_ITEM_DEL_PANEL, id)
    return `${ruta}?${con.toString()}`
  }
  const hrefSinProyecto = useMemo(() => {
    const sin = new URLSearchParams(resto)
    sin.delete(CLAVE_DE_PROYECTO_DE_LA_CADENA)
    return `${ruta}?${sin.toString()}`
  }, [resto, ruta])
  const vacia = estado.columnas.every((c) => c.tarjetas.length === 0)
  const sinFases = estado.columnas.every((c) => c.faseId === null)
  return (
    <FilterShell esquema={esquema}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        {filtros.proyecto ? <AvisoDelProyecto hrefSinProyecto={hrefSinProyecto} /> : null}
        {sinFases ? (
          <CadenaSinFases enlaceAFlujos={enlaceAFlujos} />
        ) : vacia && filtrada ? (
          <SinResultadosDeLaCadena conBusqueda={filtros.q !== null} />
        ) : vacia ? (
          <CadenaSinRepuestos />
        ) : (
          <TableroDeRepuestos
            estado={estado}
            filtrada={filtrada}
            ahora={instante}
            hrefDe={hrefDe}
            alAbrir={item.abrir}
          />
        )}
      </div>
    </FilterShell>
  )
}
