'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Pagina } from '@/shared/lib/paginacion'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion } from '@/shared/ui/paginacion'
import type { FilaDeDeclaracion } from '../../../entities/aduana/declaracion'
import { TablaDeDeclaraciones } from './tabla-de-declaraciones'
import { TarjetasDeDeclaraciones } from './tarjetas-de-declaraciones'

type Props = {
  pagina: Pagina<FilaDeDeclaracion>
  alAbrir: (id: string) => void
  abierta: string | null
}

// Dónde estás: sin total ni «Página N». Con cursor se ofrece volver a lo más reciente (la base sólo camina hacia adelante).
function DondeEstas() {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  if (!parametros.has(CLAVE_DE_CURSOR)) {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">Las más recientes.</p>
  }
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Más antiguas que las anteriores.</span>
      <Link
        href={`${ruta}?${parametros.toString()}` as Route}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Volver a las más recientes
      </Link>
    </p>
  )
}

// La lista o el estado que corresponda: vacío de primera vez, vacío por filtro (con «Limpiar») o una página que se quedó sin filas. Una sola vista (`<UnaSolaVista>`): la tabla desde
// `md` y las tarjetas por debajo. Ningún total ni suma.
export function ResultadoDeAduana({ pagina, alAbrir, abierta }: Props) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)

  if (pagina.filas.length === 0) {
    if (filtros.hayFiltros) {
      return (
        <EstadoSinResultados
          alLimpiar={filtros.limpiar}
          descripcion="Ninguna declaración coincide con los filtros."
        />
      )
    }
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    return <EstadoVacio titulo="Todavía no hay declaraciones." />
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <DondeEstas />
      <UnaSolaVista
        tabla={() => (
          <TablaDeDeclaraciones declaraciones={pagina.filas} alAbrir={alAbrir} abierta={abierta} />
        )}
        tarjetas={() => (
          <TarjetasDeDeclaraciones
            declaraciones={pagina.filas}
            alAbrir={alAbrir}
            abierta={abierta}
          />
        )}
      />
      <Paginacion siguiente={pagina.siguiente} anterior={null} />
    </div>
  )
}
