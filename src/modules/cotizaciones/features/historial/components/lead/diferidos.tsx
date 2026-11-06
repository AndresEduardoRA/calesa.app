'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeLasCotizaciones } from '../pestana/esqueleto-de-las-cotizaciones'

// La sección «Cotizaciones» de la ficha del lead: su código llega al abrirla, no con la ficha. Va en su propio `diferidos.tsx`: el de la pestaña del vehículo lo pagaría
// `/vehiculos/[id]` y el del historial del panel, `/cotizaciones/nuevo` (4-73). El aviso de «Sin conexión» va en su lugar (`'aqui'`).
export const CotizacionesDelLead = diferido(
  () => import('../cotizaciones-del-lead').then((modulo) => modulo.CotizacionesDelLead),
  { aviso: 'aqui', esqueleto: <EsqueletoDeLasCotizaciones /> },
)
