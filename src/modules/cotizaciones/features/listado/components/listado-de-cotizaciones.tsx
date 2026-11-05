'use client'

import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { FilterShell } from '@/shared/ui/filtros'
import { AvisoDelVehiculo } from './aviso-del-vehiculo'
import { NuevaCotizacion } from './nueva-cotizacion'
import { ResultadoDelListado } from './resultado-del-listado'
import type { FilaDeCotizacion, OrigenDelListado } from './tipos'

type Props = {
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeCotizacion>
  // «Ítems por página»: lo que dibuja esta página y hasta cuánto ofrece el selector.
  porPagina: { valor: number; opciones: readonly number[] }
  origenes: readonly OrigenDelListado[]
  // La ruta de «Nueva cotización», o null si quien mira no cotiza en ningún origen (sin el botón).
  rutaDeNueva: string | null
  // Con `?vehiculo=`: el título del vehículo (null si quien mira no lo ve). Sin él, `undefined`.
  vehiculo?: { titulo: string | null }
}

// El listado de cotizaciones: filtros, «Nueva cotización» y la lista. Todo el estado (filtros, página) vive en la URL.
export function ListadoDeCotizaciones({
  esquema,
  pagina,
  porPagina,
  origenes,
  rutaDeNueva,
  vehiculo,
}: Props) {
  const nueva = rutaDeNueva === null ? undefined : <NuevaCotizacion ruta={rutaDeNueva} />
  return (
    <div className="grid gap-4">
      <FilterShell esquema={esquema} porPagina={porPagina} acciones={nueva}>
        {vehiculo ? <AvisoDelVehiculo titulo={vehiculo.titulo} /> : null}
        <ResultadoDelListado
          pagina={pagina}
          origenes={origenes}
          accionDeVacio={nueva}
          deUnVehiculo={vehiculo !== undefined}
        />
      </FilterShell>
    </div>
  )
}
