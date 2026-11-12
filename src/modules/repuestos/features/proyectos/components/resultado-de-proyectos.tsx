'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion } from '@/shared/ui/paginacion'
import type { EstadoDelListado, PaginaDeProyectos } from '../../../entities/proyectos/listado'
import { rutaDelProyecto } from '../../../entities/proyectos/rutas'
import { TablaDeProyectos } from './tabla-de-proyectos'
import { TarjetasDeProyectos } from './tarjetas-de-proyectos'

type Props = {
  pagina: PaginaDeProyectos
  estado: EstadoDelListado
  // «Nuevo proyecto», si la persona puede crear: lo llena el vacío de primera vez.
  nuevo: ReactNode
}

// Dónde estás: sin total ni «Página N». Con cursor se ofrece volver al principio (la base sólo camina hacia adelante, sin «Anterior»).
function VolverAlPrincipio() {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Estás viendo proyectos más antiguos.</span>
      <Link
        href={`${ruta}?${parametros.toString()}` as Route}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Volver al principio
      </Link>
    </p>
  )
}

// La lista o el estado que corresponda: vacío de primera vez, vacío por filtro (con «Limpiar»), una página que se quedó sin filas o los proyectos, en una sola vista (la tabla desde
// `md` y tarjetas por debajo). Ningún total: la base no cuenta.
export function ResultadoDeProyectos({ pagina, estado, nuevo }: Props) {
  const router = useRouter()
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)

  if (pagina.filas.length === 0) {
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    if (filtros.hayFiltros) {
      return <EstadoSinResultados alLimpiar={filtros.limpiar} />
    }
    return (
      <EstadoVacio
        titulo="Todavía no hay proyectos de repuestos."
        descripcion={
          estado === 'abiertos'
            ? 'Los proyectos cerrados no se muestran: elige «Todos» en Estado para verlos.'
            : undefined
        }
        accion={nuevo}
      />
    )
  }

  const abrir = (id: string) => {
    router.push(rutaDelProyecto(id) as Route)
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {hayCursor ? <VolverAlPrincipio /> : null}
      <UnaSolaVista
        tabla={() => <TablaDeProyectos proyectos={pagina.filas} alAbrir={abrir} />}
        tarjetas={() => <TarjetasDeProyectos proyectos={pagina.filas} alAbrir={abrir} />}
      />
      <Paginacion
        siguiente={pagina.siguiente === null ? null : String(pagina.siguiente)}
        anterior={null}
      />
    </div>
  )
}
