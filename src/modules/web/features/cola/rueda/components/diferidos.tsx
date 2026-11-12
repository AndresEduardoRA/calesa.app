'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDelPanelAgregarALaRueda } from './panel-agregar-a-la-rueda'

// El panel de «Agregar a la rueda» se pide al abrirse (`useAbiertoAlgunaVez()`): el tablero no carga el código del formulario para mostrarse.
export const PanelAgregarALaRuedaDiferido = diferido<PropsDelPanelAgregarALaRueda>(() =>
  import('./panel-agregar-a-la-rueda').then((modulo) => modulo.PanelAgregarALaRueda),
)
