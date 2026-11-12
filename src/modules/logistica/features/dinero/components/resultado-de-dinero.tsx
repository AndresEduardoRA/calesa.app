'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { formatearFecha } from '@/shared/lib/fechas'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion } from '@/shared/ui/paginacion'
import { useRegional } from '@/shared/ui/regional'
import type { ListaDeDinero } from './tipos-de-la-lista'
import { TablaDeGastos } from './tabla-de-gastos'
import { TablaDePagos } from './tabla-de-pagos'
import { TarjetasDeGastos } from './tarjetas-de-gastos'
import { TarjetasDePagos } from './tarjetas-de-pagos'

type Props = {
  lista: ListaDeDinero
  alAbrir: (id: string) => void
  abierta: string | null
}

const VACIO_DE_PRIMERA_VEZ = {
  gastos: 'Todavía no hay gastos que puedas ver.',
  pagos: 'Todavía no hay pagos que puedas ver.',
} as const

// Dónde estás: sin total ni «Página N». Con cursor se dice desde qué fecha y se ofrece volver a lo más reciente (la base sólo camina hacia adelante).
function DondeEstas({ desde }: { desde: string | null }) {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  const { zonaHoraria } = useRegional()
  if (desde === null) {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">Los más recientes.</p>
  }
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Desde el {formatearFecha(desde, { zona: zonaHoraria })}.</span>
      <Link
        href={`${ruta}?${parametros.toString()}` as Route}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Volver a los más recientes
      </Link>
    </p>
  )
}

// La lista o el estado que corresponda: vacío de primera vez (sin acción: se carga desde una unidad), vacío por filtro (con «Limpiar») o una página que se quedó sin filas. Una sola vista
// (`<UnaSolaVista>`): la tabla desde `md` y las tarjetas por debajo. Ningún total ni suma.
export function ResultadoDeDinero({ lista, alAbrir, abierta }: Props) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  const { pagina } = lista

  if (pagina.filas.length === 0) {
    if (filtros.hayFiltros) {
      return <EstadoSinResultados alLimpiar={filtros.limpiar} />
    }
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    return <EstadoVacio titulo={VACIO_DE_PRIMERA_VEZ[lista.vista]} />
  }

  const primera = pagina.filas[0]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <DondeEstas desde={hayCursor && primera ? primera.fecha : null} />
      {lista.vista === 'gastos' ? (
        <UnaSolaVista
          tabla={() => (
            <TablaDeGastos gastos={lista.pagina.filas} alAbrir={alAbrir} abierta={abierta} />
          )}
          tarjetas={() => (
            <TarjetasDeGastos gastos={lista.pagina.filas} alAbrir={alAbrir} abierta={abierta} />
          )}
        />
      ) : (
        <UnaSolaVista
          tabla={() => (
            <TablaDePagos pagos={lista.pagina.filas} alAbrir={alAbrir} abierta={abierta} />
          )}
          tarjetas={() => (
            <TarjetasDePagos pagos={lista.pagina.filas} alAbrir={alAbrir} abierta={abierta} />
          )}
        />
      )}
      <Paginacion siguiente={pagina.siguiente} anterior={null} />
    </div>
  )
}
