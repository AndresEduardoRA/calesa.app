'use client'

import { useEffect, useEffectEvent } from 'react'
import { usePaginasDelHistorial } from '../hooks/use-paginas-del-historial'
import { ListaDelHistorial } from './lista-del-historial'

// La sección «Cotizaciones» de la ficha de un lead: las que quien mira ve, de la más nueva a la más vieja, de a 20 con «Ver más» hasta 500 y, en el tope,
// «Ver todas en Cotizaciones» (`/cotizaciones?lead=`, el camino a lo antiguo). Se lee al montarse (nunca con la ficha) y desde el navegador, con la RLS de quien mira.
// Quien la monta pone `key={leadId}`: pasar de un lead a otro empieza de cero.
export function CotizacionesDelLead({ leadId }: { leadId: string }) {
  const historial = usePaginasDelHistorial({ lead: leadId })
  // Una sola guardia de descarte: el `ultimo` de las páginas (también en el doble montaje de desarrollo).
  const leerAlMontar = useEffectEvent(historial.leerLaPrimera)
  useEffect(() => {
    leerAlMontar()
  }, [])
  return (
    <ListaDelHistorial
      historial={historial}
      de={{ lead: leadId }}
      etiqueta="Cotizaciones del lead"
      esperarEsqueleto={false}
    />
  )
}
