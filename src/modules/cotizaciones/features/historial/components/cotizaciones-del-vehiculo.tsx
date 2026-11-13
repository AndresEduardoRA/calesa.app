'use client'

import { useEffect, useEffectEvent } from 'react'
import { usePaginasDelHistorial } from '../hooks/use-paginas-del-historial'
import { ListaDelHistorial } from './lista-del-historial'

// La pestaña «Cotizaciones» de la ficha de un vehículo: las que quien mira ve, de la más nueva a la más vieja, de a 20 con «Ver más» hasta 500 y, en el tope,
// «Ver todas en Cotizaciones» (el camino a lo antiguo). Se lee al montarse (nunca con la ficha) y desde el navegador, con la RLS de quien mira. Quien la monta
// pone `key={vehiculoId}`: pasar de un vehículo a otro empieza de cero.
export function CotizacionesDelVehiculo({ vehiculoId }: { vehiculoId: string }) {
  const historial = usePaginasDelHistorial({ vehiculo: vehiculoId })
  // Una sola guardia de descarte: el `ultimo` de las páginas. En el doble montaje de desarrollo el segundo pedido deja viejo al primero y sólo llega una página.
  const leerAlMontar = useEffectEvent(historial.leerLaPrimera)
  useEffect(() => {
    leerAlMontar()
  }, [])
  return (
    <ListaDelHistorial
      historial={historial}
      de={{ vehiculo: vehiculoId }}
      etiqueta="Cotizaciones del vehículo"
      esperarEsqueleto={false}
    />
  )
}
