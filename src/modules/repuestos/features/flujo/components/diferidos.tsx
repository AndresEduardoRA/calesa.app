'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del ítem se pide al abrirse: su código no viaja con la hoja (8.13-2, C13).
export const DrawerDelItemDiferido = diferido(() =>
  import('./drawer-del-item').then((modulo) => modulo.DrawerDelItem),
)

// El hueco «Repuestos» del panel del vehículo se pide recién al abrir su bloque (8.13-3, C14).
export const HuecoDeEsperasDiferido = diferido(() =>
  import('./hueco-de-esperas').then((modulo) => modulo.HuecoDeEsperas),
)
