'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel para agregar un vehículo y la confirmación de desvincular se piden recién al abrirse: la
// sección no carga su código para mostrar las listas. Se montan con `useAbiertoAlgunaVez()`.
export const PanelAgregarVehiculoDiferido = diferido(() =>
  import('./panel-agregar-vehiculo').then((modulo) => modulo.PanelAgregarVehiculo),
)

export const ConfirmarDesvincularDiferido = diferido(() =>
  import('./confirmar-desvincular').then((modulo) => modulo.ConfirmarDesvincular),
)
