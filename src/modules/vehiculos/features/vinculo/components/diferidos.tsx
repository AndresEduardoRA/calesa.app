'use client'

import dynamic from 'next/dynamic'

// El panel para agregar un vehículo y la confirmación de desvincular se piden recién al abrirse: la
// sección no carga su código para mostrar las listas. Se montan con `useAbiertoAlgunaVez()`.
export const PanelAgregarVehiculoDiferido = dynamic(
  () => import('./panel-agregar-vehiculo').then((modulo) => modulo.PanelAgregarVehiculo),
  { ssr: false },
)

export const ConfirmarDesvincularDiferido = dynamic(
  () => import('./confirmar-desvincular').then((modulo) => modulo.ConfirmarDesvincular),
  { ssr: false },
)
