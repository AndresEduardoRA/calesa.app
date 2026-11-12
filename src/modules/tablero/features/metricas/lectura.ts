import 'server-only'
import { cache } from 'react'
import { repositorioDeMetricas } from '../../composicion'

// Varios widgets del mismo grupo comparten una sola llamada por request: `cache()` con `(desde, hasta)` como clave.
export const leerMetricasDeLeads = cache((desde: string, hasta: string) =>
  repositorioDeMetricas.leads(desde, hasta),
)

export const leerMetricasDeCotizaciones = cache((desde: string, hasta: string) =>
  repositorioDeMetricas.cotizaciones(desde, hasta),
)
