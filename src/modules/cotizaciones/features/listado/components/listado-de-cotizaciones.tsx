'use client'

import type { ReactNode } from 'react'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { FilterShell } from '@/shared/ui/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { LecturaDelServidor } from '../../../entities/listado/resumen-del-listado'
import { useResumenDeCotizacion } from '../hooks/use-resumen-de-cotizacion'
import { AvisoDelVehiculo } from './aviso-del-vehiculo'
import { ResumenDeCotizacionDiferido } from './diferidos'
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
  // Lo que el servidor leyó de la cotización de `?cotizacion=` cuando no está en la página (null si no hay clave, no es un guid o está en la página).
  delServidor: LecturaDelServidor | null
  // Lo que un área suma junto a «Nueva cotización» (4.15-6b, la papelera del 4.24): ya dibujado por la página y antes de «Nueva». Sin él, la barra queda como siempre.
  junto?: ReactNode
}

// El listado de cotizaciones: filtros, «Nueva cotización» y la lista. Todo el estado (filtros, página) vive en la URL.
export function ListadoDeCotizaciones({
  esquema,
  pagina,
  porPagina,
  origenes,
  rutaDeNueva,
  vehiculo,
  delServidor,
  junto,
}: Props) {
  const resumen = useResumenDeCotizacion()
  // El resumen llega recién al abrirse (`diferido()`) y, una vez visto, queda montado para irse con su animación.
  const resumenMontado = useAbiertoAlgunaVez(resumen.texto !== null)
  const nueva = rutaDeNueva === null ? undefined : <NuevaCotizacion ruta={rutaDeNueva} />
  // El vacío ofrece sólo «Nueva»: lo de `junto` es de la barra.
  const acciones =
    junto === undefined ? (
      nueva
    ) : (
      <>
        {junto}
        {nueva}
      </>
    )
  return (
    <div className="grid gap-4">
      <FilterShell esquema={esquema} porPagina={porPagina} acciones={acciones}>
        {vehiculo ? <AvisoDelVehiculo titulo={vehiculo.titulo} /> : null}
        <ResultadoDelListado
          pagina={pagina}
          origenes={origenes}
          accionDeVacio={nueva}
          deUnVehiculo={vehiculo !== undefined}
          alAbrir={resumen.abrir}
          abierta={resumen.id}
        />
      </FilterShell>
      {resumenMontado ? (
        <ResumenDeCotizacionDiferido
          filas={pagina.filas}
          origenes={origenes}
          delServidor={delServidor}
        />
      ) : null}
    </div>
  )
}
