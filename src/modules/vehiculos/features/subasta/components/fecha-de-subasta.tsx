'use client'

import { formatearFechaHoraConZona } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import { zonaDelPatio } from '../../../entities/zona-del-patio'

type Props = {
  iso: string
  // El estado o provincia del patio (`ubicacion_estado`): de ahí, la hora del patio. Sin él, no se dice.
  estadoDelPatio?: unknown
  // En la ficha, las otras horas se ven debajo; en una línea chica (el panel, la barra), sólo en el tooltip y para el lector de pantalla.
  detalle?: boolean
}

// La fecha de una subasta en la zona de quien mira (`/perfil` › «Zona horaria»; si no eligió, la de la empresa), con la abreviatura de la zona
// («14:00 GMT-4»). Además, la hora del patio (estimada por su estado: «hora del patio, TX») y la de la empresa si es otra.
export function FechaDeSubasta({ iso, estadoDelPatio, detalle = false }: Props) {
  const { zonaDeLaPersona, zonaHoraria } = useRegional()
  const patio = zonaDelPatio(estadoDelPatio)
  const otras = [
    patio !== null && patio !== zonaDeLaPersona
      ? `Hora del patio: ${formatearFechaHoraConZona(iso, { zona: patio })}`
      : null,
    zonaHoraria !== zonaDeLaPersona
      ? `Hora de la empresa: ${formatearFechaHoraConZona(iso, { zona: zonaHoraria })}`
      : null,
  ].filter((linea): linea is string => linea !== null)
  return (
    <span className="inline-grid">
      <time dateTime={iso} title={otras.length > 0 ? otras.join('\n') : undefined}>
        {formatearFechaHoraConZona(iso, { zona: zonaDeLaPersona })}
      </time>
      {otras.length > 0 ? (
        detalle ? (
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">
            {otras.join(' · ')}
          </span>
        ) : (
          <span className="sr-only">{`, ${otras.join(', ')}`}</span>
        )
      ) : null}
    </span>
  )
}
