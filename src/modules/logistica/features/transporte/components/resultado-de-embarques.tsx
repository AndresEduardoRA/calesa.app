'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion } from '@/shared/ui/paginacion'
import type { PaginaDeGrupos } from '../../../entities/transporte/grupos'
import { TablaDeGrupos } from './tabla-de-grupos'
import { TarjetasDeGrupos } from './tarjetas-de-grupos'
import type { PropsDeLaFila } from './tipos-de-la-lista'

type Props = PropsDeLaFila & { pagina: PaginaDeGrupos }

// Dónde estás: sin total ni «Página N». La base sólo camina hacia adelante, así que con cursor se ofrece volver al principio.
function DondeEstas() {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  if (!parametros.has(CLAVE_DE_CURSOR)) {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">Las primeras.</p>
  }
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Siguen las anteriores.</span>
      <Link
        href={`${ruta}?${parametros.toString()}` as Route}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Volver al principio
      </Link>
    </p>
  )
}

// «Seguir buscando»: la base paró a las 2.000 filas sin llenar la página y `siguiente` sigue desde ahí.
function SeguirBuscando({ siguiente }: { siguiente: string }) {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.set(CLAVE_DE_CURSOR, siguiente)
  return (
    <Link
      href={`${ruta}?${parametros.toString()}` as Route}
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      Seguir buscando
    </Link>
  )
}

// La lista o el estado que corresponda: vacío de primera vez, vacío por filtro (con «Limpiar»), una página que se quedó sin filas o una parte revisada sin coincidencias («Seguir buscando»).
// Una sola vista (`<UnaSolaVista>`): la tabla desde `md` y las tarjetas por debajo. Ningún total ni suma.
export function ResultadoDeEmbarques({ pagina, vista, catalogos, alAbrir, abierto }: Props) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  const que = vista === 'contenedores' ? 'contenedor' : 'embarque'

  if (pagina.grupos.length === 0) {
    if (pagina.cortada && pagina.siguiente !== null) {
      return (
        <EstadoVacio
          titulo="Ningún grupo de esta parte coincide."
          descripcion="Se revisó una parte de la lista y no se llenó la página."
          accion={<SeguirBuscando siguiente={pagina.siguiente} />}
        />
      )
    }
    if (filtros.hayFiltros) {
      return (
        <EstadoSinResultados
          alLimpiar={filtros.limpiar}
          descripcion={
            vista === 'contenedores'
              ? 'Ningún contenedor coincide con los filtros.'
              : 'Ningún embarque coincide con los filtros.'
          }
        />
      )
    }
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    return (
      <EstadoVacio
        titulo={
          vista === 'contenedores'
            ? 'Todavía no hay contenedores cargados.'
            : 'Todavía no hay embarques con booking.'
        }
      />
    )
  }

  const props = { vista, catalogos, alAbrir, abierto, grupos: pagina.grupos }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-vista={que}>
      <DondeEstas />
      <UnaSolaVista
        tabla={() => <TablaDeGrupos {...props} />}
        tarjetas={() => <TarjetasDeGrupos {...props} />}
      />
      {pagina.cortada && pagina.siguiente !== null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Se revisó una parte de la lista y no se llenó la página. «Siguiente» sigue buscando.
        </p>
      ) : null}
      <Paginacion siguiente={pagina.siguiente} anterior={null} />
    </div>
  )
}
