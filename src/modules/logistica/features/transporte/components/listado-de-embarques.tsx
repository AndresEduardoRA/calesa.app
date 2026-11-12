'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { FilterShell } from '@/shared/ui/filtros'
import type { PaginaDeGrupos } from '../../../entities/transporte/grupos'
import {
  CLAVE_DE_GRUPO,
  ETIQUETA_DE_VISTA_DE_GRUPOS,
  VISTAS_DE_GRUPOS,
  type VistaDeGrupos,
} from '../../../entities/transporte/paneles'
import { useAbrirElGrupo } from '../hooks/use-abrir-el-grupo'
import { ResultadoDeEmbarques } from './resultado-de-embarques'
import type { CatalogosParaNombrar } from './tipos-de-la-lista'

type Props = {
  pagina: PaginaDeGrupos
  vista: VistaDeGrupos
  esquema: EsquemaDeFiltros
  catalogos: CatalogosParaNombrar
  // La ruta de la página (la pone `src/app`) y el `?booking=` o `?contenedor=` de la vista (dueña del drawer).
  ruta: string
  claveDelResumen: string
}

// Las vistas «Embarques» y «Contenedores»: enlaces (la vista es `?grupo=`) y no pestañas, así recargar y compartir llevan a la misma lista. Cambiar de vista no conserva filtros ni página:
// la búsqueda y el cursor significan otra cosa en cada tipo (D24).
function Vistas({ vista, ruta }: { vista: VistaDeGrupos; ruta: string }) {
  return (
    <nav aria-label="Qué lista ver" className="flex flex-wrap gap-2">
      {VISTAS_DE_GRUPOS.map((cada) => (
        <Link
          key={cada}
          href={`${ruta}?${CLAVE_DE_GRUPO}=${cada}` as Route}
          aria-current={cada === vista ? 'page' : undefined}
          className={buttonVariants({
            variant: cada === vista ? 'secondary' : 'ghost',
            className: 'h-11 md:h-9',
          })}
        >
          {ETIQUETA_DE_VISTA_DE_GRUPOS[cada]}
        </Link>
      ))}
    </nav>
  )
}

// La lista de embarques o de contenedores con sus filtros en la URL. La fila abre el resumen del grupo (`?booking=` o `?contenedor=`) conservando filtros y página.
export function ListadoDeEmbarques({
  pagina,
  vista,
  esquema,
  catalogos,
  ruta,
  claveDelResumen,
}: Props) {
  const grupo = useAbrirElGrupo(claveDelResumen)
  return (
    <div className="grid gap-4">
      <Vistas vista={vista} ruta={ruta} />
      <FilterShell esquema={esquema}>
        <ResultadoDeEmbarques
          pagina={pagina}
          vista={vista}
          catalogos={catalogos}
          alAbrir={grupo.abrir}
          abierto={grupo.abierto}
        />
      </FilterShell>
    </div>
  )
}
