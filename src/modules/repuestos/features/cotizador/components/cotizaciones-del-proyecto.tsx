'use client'

import type { FilaDeCotizacion } from '../../../entities/cotizador/cotizacion'
import { ListaDeCotizaciones } from './lista-de-cotizaciones'
import { NuevaCotizacion, type MonedaParaCotizar } from './nueva-cotizacion'

type Props = {
  proyectoId: string
  filas: readonly FilaDeCotizacion[]
  hayMas: boolean
  monedas: readonly MonedaParaCotizar[]
  cerrado: boolean
  puedeConfigurar: boolean
}

// La pestaña «Cotizaciones» de un proyecto (8.12-3, C11): «Nueva cotización» arriba de la lista (también vacía). Editar, aceptar y anular llegan con 8.12-4.
export function CotizacionesDelProyecto({
  proyectoId,
  filas,
  hayMas,
  monedas,
  cerrado,
  puedeConfigurar,
}: Props) {
  return (
    <div className="grid gap-3">
      <NuevaCotizacion
        proyectoId={proyectoId}
        monedas={monedas}
        cerrado={cerrado}
        puedeConfigurar={puedeConfigurar}
      />
      <ListaDeCotizaciones proyectoId={proyectoId} filas={filas} hayMas={hayMas} />
    </div>
  )
}
