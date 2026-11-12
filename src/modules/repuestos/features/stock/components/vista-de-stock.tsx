'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoVacio } from '@/shared/ui/estados'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion } from '@/shared/ui/paginacion'
import type { FilaDeStock, PaginaDeStock } from '../../../entities/stock/listado'
import { rutaDelStockDelItem } from '../../../entities/stock/vista'
import { TablaDeStock } from './tabla-de-stock'
import { TarjetasDeStock } from './tarjetas-de-stock'

type Props = { pagina: PaginaDeStock }

// Con cursor se ofrece volver al principio (la base sólo camina hacia adelante, sin «Anterior»).
function VolverAlPrincipio() {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Estás viendo lo que entró a stock antes.</span>
      <Link
        href={`${ruta}?${parametros.toString()}` as Route}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Volver al principio
      </Link>
    </p>
  )
}

// La vista «Stock» de `/repuestos` (`?vista=stock`, 8.10-3, C8): lo que sobró de los ítems, lo más nuevo primero, de a una página por cursor y sin filtros (D4). La fila abre el
// ítem en la hoja de su proyecto con su panel de stock (D5). Ningún total: la base no cuenta.
export function VistaDeStock({ pagina }: Props) {
  const router = useRouter()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  if (pagina.filas.length === 0) {
    return hayCursor ? (
      <EstadoPaginaSinFilas />
    ) : (
      <EstadoVacio
        titulo="No hay repuestos en stock."
        descripcion="Lo que sobra de un ítem se pasa a stock desde la hoja de su proyecto."
      />
    )
  }
  const abrir = (fila: FilaDeStock) => {
    router.push(rutaDelStockDelItem(fila) as Route)
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {hayCursor ? <VolverAlPrincipio /> : null}
      <UnaSolaVista
        tabla={() => <TablaDeStock filas={pagina.filas} alAbrir={abrir} />}
        tarjetas={() => <TarjetasDeStock filas={pagina.filas} alAbrir={abrir} />}
      />
      <Paginacion siguiente={pagina.siguiente} anterior={null} />
    </div>
  )
}
