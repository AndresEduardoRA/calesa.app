'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del stock de un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): nada de su código viaja con la hoja (8.10-2, C10).
export const DrawerDeStockDiferido = diferido(() =>
  import('./drawer-de-stock').then((modulo) => modulo.DrawerDeStock),
)
