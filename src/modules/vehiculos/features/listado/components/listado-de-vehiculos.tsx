'use client'

import type { ReactNode } from 'react'
import type { VistaGuardada } from '@/modules/equipo/client'
import type { OrigenResumen } from '@/modules/origenes/client'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { FilterShell } from '@/shared/ui/filtros'
import { camposFiltrables } from '../../../entities/filtros'
import { PestanasDeOrigen } from './pestanas-de-origen'
import { PieDeFiltros } from './pie-de-filtros'
import { ResultadoDelListado } from './resultado-del-listado'
import type { DatosDelOrigen, FilaDeVehiculo } from './tipos'
import { VistasDeVehiculos } from './vistas-de-vehiculos'

type Props = DatosDelOrigen & {
  // Las pestañas: los orígenes donde la persona ve vehículos.
  origenes: readonly OrigenResumen[]
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeVehiculo>
  vistas: readonly VistaGuardada[]
  puedeConfigurarCampos: boolean
  // «Nuevo» en la barra y en el vacío de primera vez, si corresponde.
  acciones?: ReactNode
  accionDeVacio?: ReactNode
}

// El inventario: una pestaña por origen y, adentro, los filtros de ese origen y su lista. Todo el
// estado (origen, filtros, página) vive en la URL.
export function ListadoDeVehiculos(props: Props) {
  const { origenes, esquema, vistas, puedeConfigurarCampos, acciones, ...resto } = props
  const { origen, campos } = resto
  return (
    <div className="grid gap-4">
      <PestanasDeOrigen origenes={origenes} actual={origen.id} />
      {/* Los filtros salen del layout de cada origen: al cambiar de pestaña se arma otro. */}
      <FilterShell
        key={origen.id}
        esquema={esquema}
        vistas={<VistasDeVehiculos esquema={esquema} origenId={origen.id} vistas={vistas} />}
        acciones={acciones}
        pieDelPanel={
          <PieDeFiltros
            origen={origen}
            filtrables={camposFiltrables(campos).length}
            puedeConfigurar={puedeConfigurarCampos}
          />
        }
      >
        <ResultadoDelListado {...resto} />
      </FilterShell>
    </div>
  )
}
