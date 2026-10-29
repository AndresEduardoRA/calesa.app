'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del vehículo se pide recién al abrirse: la hoja de cotizar no carga su código para dibujar la barra. Se monta con
// `useAbiertoAlgunaVez()`.
export const PanelDelVehiculoDiferido = diferido(() =>
  import('./panel-del-vehiculo').then((modulo) => modulo.PanelDelVehiculo),
)
