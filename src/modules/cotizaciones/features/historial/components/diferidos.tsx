'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDelHistorial } from './esqueleto-del-historial'

// El historial se pide al abrir el panel del vehículo, no con la hoja: lo nombra la página de cotizar y su código llega con él. El aviso de «Sin conexión» va en
// su lugar dentro del panel (`'aqui'`): el de omisión es una barra fija de la pantalla, pensada para los modales y paneles que aún no tienen lugar.
export const HistorialDelVehiculo = diferido(
  () => import('./historial-del-vehiculo').then((modulo) => modulo.HistorialDelVehiculo),
  { aviso: 'aqui', esqueleto: <EsqueletoDelHistorial /> },
)
