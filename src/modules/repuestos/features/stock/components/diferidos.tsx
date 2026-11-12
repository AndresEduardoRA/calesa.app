'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del stock de un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): nada de su código viaja con la hoja (8.10-2, C10).
export const DrawerDeStockDiferido = diferido(() =>
  import('./drawer-de-stock').then((modulo) => modulo.DrawerDeStock),
)

// «Vender suelto» y «Devolver al proveedor» de la vista «Stock» (8.10-3, C11): su código no viaja con la lista.
export const DrawerDeSalidaDiferido = diferido(() =>
  import('./drawer-de-salida').then((modulo) => modulo.DrawerDeSalida),
)

// «Reasignar a un proyecto» de la vista «Stock» (8.10-3, C13).
export const DrawerDeReasignarDiferido = diferido(() =>
  import('./drawer-de-reasignar').then((modulo) => modulo.DrawerDeReasignar),
)
