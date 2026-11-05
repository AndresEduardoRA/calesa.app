'use client'

import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { ubicacionDeLaPagina, type Pagina } from '@/shared/lib/paginacion'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion, UbicacionDeLaPagina } from '@/shared/ui/paginacion'
import { EnlaceVerTodas } from './aviso-del-vehiculo'
import { TablaDeCotizaciones } from './tabla-de-cotizaciones'
import { TarjetasDeCotizaciones } from './tarjetas-de-cotizaciones'
import type { FilaDeCotizacion, OrigenDelListado } from './tipos'

type Props = {
  pagina: Pagina<FilaDeCotizacion>
  origenes: readonly OrigenDelListado[]
  // «Nueva cotización», si la persona puede cotizar en algún origen: llena el vacío de primera vez.
  accionDeVacio?: ReactNode
  // Con `?vehiculo=`: el vacío sin otros filtros habla de ese vehículo.
  deUnVehiculo?: boolean
  // Abre el resumen de una cotización y cuál está abierta (`?cotizacion=`).
  alAbrir: (id: string) => void
  abierta: string | null
}

// La lista o el estado que corresponda: vacío de primera vez, vacío por filtro (con «Limpiar») o una página que se quedó sin filas. Una sola vista (`<UnaSolaVista>`): la tabla
// desde `md` y las tarjetas por debajo. Sin total ni «Página N de M»: sólo dónde estás y Anterior o Siguiente.
export function ResultadoDelListado({
  pagina,
  origenes,
  accionDeVacio,
  deUnVehiculo,
  alAbrir,
  abierta,
}: Props) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)

  if (pagina.filas.length === 0) {
    if (filtros.hayFiltros) {
      return <EstadoSinResultados alLimpiar={filtros.limpiar} />
    }
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    if (deUnVehiculo) {
      return (
        <EstadoVacio
          titulo="Sin cotizaciones de este vehículo que puedas ver."
          accion={<EnlaceVerTodas />}
        />
      )
    }
    return (
      <EstadoVacio
        titulo="Todavía no hay cotizaciones que puedas ver."
        descripcion="Las que se guarden desde la hoja de cotizar van a aparecer acá."
        accion={accionDeVacio}
      />
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <UbicacionDeLaPagina ubicacion={ubicacionDeLaPagina(pagina)} />
      <UnaSolaVista
        tabla={() => (
          <TablaDeCotizaciones
            cotizaciones={pagina.filas}
            origenes={origenes}
            alAbrir={alAbrir}
            abierta={abierta}
          />
        )}
        tarjetas={() => (
          <TarjetasDeCotizaciones
            cotizaciones={pagina.filas}
            origenes={origenes}
            alAbrir={alAbrir}
            abierta={abierta}
          />
        )}
      />
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
    </div>
  )
}
