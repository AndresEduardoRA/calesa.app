'use client'

import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { FilterShell } from '@/shared/ui/filtros'
import type { FilaDeDeclaracion } from '../../../entities/aduana/declaracion'
import { useAbrirLaDeclaracion } from '../hooks/use-abrir-la-declaracion'
import { ResultadoDeAduana } from './resultado-de-aduana'

type Props = {
  pagina: Pagina<FilaDeDeclaracion>
  esquema: EsquemaDeFiltros
  // El `?declaracion=` de la página (la clave la pone `src/app`, dueña del panel del resumen).
  claveDeDeclaracion: string
}

// La lista de declaraciones con sus filtros en la URL. La fila abre el resumen (`?declaracion=`) conservando filtros y página.
export function ListadoDeAduana({ pagina, esquema, claveDeDeclaracion }: Props) {
  const declaracion = useAbrirLaDeclaracion(claveDeDeclaracion)
  return (
    <div className="grid gap-4">
      <FilterShell esquema={esquema}>
        <ResultadoDeAduana
          pagina={pagina}
          alAbrir={declaracion.abrir}
          abierta={declaracion.abierta}
        />
      </FilterShell>
    </div>
  )
}
