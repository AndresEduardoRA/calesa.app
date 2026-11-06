'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeLasCotizaciones } from './esqueleto-de-las-cotizaciones'

// La pestaña «Cotizaciones» de la ficha del vehículo: su código llega al abrirla, no con la ficha. Va en su propio `diferidos.tsx` y no en el del historial del panel:
// la página de cotizar importa ése, y su JS en frío no puede crecer por una pestaña de otra pantalla (4-73). El aviso de «Sin conexión» va en su lugar (`'aqui'`).
export const CotizacionesDelVehiculo = diferido(
  () => import('../cotizaciones-del-vehiculo').then((modulo) => modulo.CotizacionesDelVehiculo),
  { aviso: 'aqui', esqueleto: <EsqueletoDeLasCotizaciones /> },
)
