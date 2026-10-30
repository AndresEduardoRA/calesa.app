'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del vehículo se pide recién al abrirse: la hoja de cotizar no carga su código para dibujar la barra. Se monta con
// `useAbiertoAlgunaVez()`.
export const PanelDelVehiculoDiferido = diferido(() =>
  import('./panel-del-vehiculo').then((modulo) => modulo.PanelDelVehiculo),
)

// El alta de adentro del panel (`?alta=`) se pide recién al abrirla: ni el formulario del vehículo ni el pegado de la subasta van con el panel.
export const AltaDesdeElPanelDiferida = diferido(() =>
  import('./alta-desde-el-panel').then((modulo) => modulo.AltaDesdeElPanel),
)
