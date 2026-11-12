'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { FilterShell } from '@/shared/ui/filtros'
import {
  ETIQUETA_DE_VISTA,
  rutaDeLaLista,
  type VistaDeDinero,
} from '../../../entities/dinero/listas'
import { useAbrirLaUnidad } from '../hooks/use-abrir-la-unidad'
import { ResultadoDeDinero } from './resultado-de-dinero'
import type { ListaDeDinero } from './tipos-de-la-lista'

type Props = {
  lista: ListaDeDinero
  // Las vistas que la persona puede ver; con una sola no hay dónde cambiar.
  vistas: readonly VistaDeDinero[]
  esquema: EsquemaDeFiltros
  // El `?vehiculo=` de la página (la clave la pone `src/app`, dueña del panel de la unidad).
  claveDeUnidad: string
}

// Las vistas «Gastos» y «Pagos»: enlaces (la vista es `?ver=`) y no pestañas, así recargar y compartir llevan a la misma lista. Cambiar de vista no conserva filtros ni página: no
// son los mismos (D5 de 6.11-3).
function Vistas({ vista, vistas }: { vista: VistaDeDinero; vistas: readonly VistaDeDinero[] }) {
  if (vistas.length < 2) {
    return null
  }
  return (
    <nav aria-label="Qué lista ver" className="flex flex-wrap gap-2">
      {vistas.map((cada) => (
        <Link
          key={cada}
          href={rutaDeLaLista({ vista: cada }) as Route}
          aria-current={cada === vista ? 'page' : undefined}
          className={buttonVariants({
            variant: cada === vista ? 'secondary' : 'ghost',
            className: 'h-11 md:h-9',
          })}
        >
          {ETIQUETA_DE_VISTA[cada]}
        </Link>
      ))}
    </nav>
  )
}

// La lista de gastos o de pagos con sus filtros en la URL. La fila abre el panel de su unidad (`?vehiculo=`) conservando filtros y página.
export function ListadoDeDinero({ lista, vistas, esquema, claveDeUnidad }: Props) {
  const unidad = useAbrirLaUnidad(claveDeUnidad)
  return (
    <div className="grid gap-4">
      <Vistas vista={lista.vista} vistas={vistas} />
      <FilterShell esquema={esquema}>
        <ResultadoDeDinero lista={lista} alAbrir={unidad.abrir} abierta={unidad.abierta} />
      </FilterShell>
    </div>
  )
}
