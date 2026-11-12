'use client'

import { SearchXIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { CLAVE_DE_CURSOR, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { Button, buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { FilterShell, useFiltrosDelListado } from '@/shared/ui/filtros'
import { cadenaFiltrada, type FiltrosDeLaCadena } from '../../../entities/cadena/filtros'
import type { CadenaLeida, ResultadoDeDondeEsta } from '../../../entities/cadena/leer'
import { useAbrirLaUnidad } from '../hooks/use-abrir-la-unidad'
import { useCadena } from '../hooks/use-cadena'
import { FranjaDeDondeEsta } from './franja-de-donde-esta'
import { TableroDeLaCadena } from './tablero-de-la-cadena'

type Props = {
  cadena: CadenaLeida
  origenId: string
  // Lo que filtra la URL, ya reducido a lo que entiende la base.
  filtros: FiltrosDeLaCadena
  esquema: EsquemaDeFiltros
  // La búsqueda con su mínimo cumplido y lo que encontró «dónde está» (`null`: no se pudo comprobar). Sin `q`, no hay franja.
  donde: { q: string; resultado: ResultadoDeDondeEsta | null } | null
  // El instante de la lectura, ISO (lo toma el servidor).
  ahora: string
  // La clave de `?vehiculo=` (la pone `src/app`, dueña del panel de la unidad).
  claveDeUnidad: string
  // La persona puede configurar flujos y la ruta existe: «este origen todavía no tiene fases» lleva ahí.
  enlaceAFlujos: boolean
}

function SinResultados() {
  const { limpiar } = useFiltrosDelListado()
  return (
    <EstadoVacio
      compacto
      Icono={SearchXIcon}
      titulo="Ningún vehículo coincide con los filtros."
      accion={
        <Button variant="outline" onClick={limpiar}>
          Limpiar
        </Button>
      }
    />
  )
}

function SinFases({ enlaceAFlujos }: { enlaceAFlujos: boolean }) {
  return (
    <EstadoVacio
      compacto
      titulo="Este origen todavía no tiene fases."
      accion={
        enlaceAFlujos ? (
          <Link
            href={RUTAS.configuracionDeFlujos as Route}
            className={buttonVariants({ variant: 'outline' })}
          >
            Configurar los flujos
          </Link>
        ) : undefined
      }
    />
  )
}

// La cadena de un origen: filtros en la URL arriba, «dónde está» si se busca, y las columnas. Abrir una tarjeta pone `?vehiculo=` y lo abre el panel de `src/app`.
export function CadenaDeLogistica({
  cadena,
  origenId,
  filtros,
  esquema,
  donde,
  ahora,
  claveDeUnidad,
  enlaceAFlujos,
}: Props) {
  const estado = useCadena(cadena, { origenId, filtros })
  const unidad = useAbrirLaUnidad(claveDeUnidad)
  const ruta = usePathname()
  const parametros = useSearchParams()
  const instante = useMemo(() => new Date(ahora), [ahora])
  const filtrada = cadenaFiltrada(filtros)
  const resto = useMemo(() => {
    const otros = new URLSearchParams(parametros)
    otros.delete(claveDeUnidad)
    otros.delete(CLAVE_DE_CURSOR)
    return otros.toString()
  }, [parametros, claveDeUnidad])
  const hrefDe = (id: string) =>
    `${ruta}?${resto}${resto === '' ? '' : '&'}${claveDeUnidad}=${encodeURIComponent(id)}`
  const vacia = estado.columnas.every((c) => c.tarjetas.length === 0)
  return (
    <FilterShell esquema={esquema}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        {donde ? (
          <FranjaDeDondeEsta resultado={donde.resultado} q={donde.q} ahora={instante} />
        ) : null}
        {estado.columnas.length === 0 ? (
          <SinFases enlaceAFlujos={enlaceAFlujos} />
        ) : vacia && filtrada ? (
          <SinResultados />
        ) : (
          <TableroDeLaCadena
            estado={estado}
            filtrada={filtrada}
            ahora={instante}
            hrefDe={hrefDe}
            alAbrir={unidad.abrir}
          />
        )}
      </div>
    </FilterShell>
  )
}
