'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del ítem se pide al abrirse: su código no viaja con la hoja (8.13-2, C13).
export const DrawerDelItemDiferido = diferido(() =>
  import('./drawer-del-item').then((modulo) => modulo.DrawerDelItem),
)
