'use client'

import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { FilterShell } from '@/shared/ui/filtros'
import type { FilaDeDeclaracion } from '../../../entities/aduana/declaracion'
import { useAbrirLaDeclaracion } from '../hooks/use-abrir-la-declaracion'
import { usePanelDeDeclaracion } from '../hooks/use-panel-de-declaracion'
import { ResultadoDeAduana } from './resultado-de-aduana'

type Props = {
  pagina: Pagina<FilaDeDeclaracion>
  esquema: EsquemaDeFiltros
  // El `?declaracion=` de la página (la clave la pone `src/app`, dueña del panel del resumen).
  claveDeDeclaracion: string
  // Con `logistica.aduana.gestionar` (la base lo vuelve a exigir): enciende «Nueva declaración».
  puedeGestionar: boolean
}

// La lista de declaraciones con sus filtros en la URL. La fila abre el resumen (`?declaracion=`) conservando filtros y página; «Nueva declaración» abre el formulario de alta (6.09-2).
export function ListadoDeAduana({ pagina, esquema, claveDeDeclaracion, puedeGestionar }: Props) {
  const declaracion = useAbrirLaDeclaracion(claveDeDeclaracion)
  const panel = usePanelDeDeclaracion()
  return (
    <div className="grid gap-4">
      {puedeGestionar ? (
        <div className="flex justify-end">
          <Button className="h-11 md:h-9" onClick={panel.abrirNueva}>
            Nueva declaración
          </Button>
        </div>
      ) : null}
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
