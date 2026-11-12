'use client'

import { diferido } from '@/shared/ui/diferido'

// El formulario de una compra se pide al abrirse (`useAbiertoAlgunaVez()`): nada de su código viaja con la lista (8.11-3, C12).
export const DrawerDeCompraDiferido = diferido(() =>
  import('./drawer-de-compra').then((modulo) => modulo.DrawerDeCompra),
)
