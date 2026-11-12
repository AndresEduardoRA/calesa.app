'use client'

import { diferido } from '@/shared/ui/diferido'

// La confirmación de eliminar un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): la hoja no carga su código para dibujarse.
export const ConfirmarEliminarItemDiferido = diferido(() =>
  import('./confirmar-eliminar-item').then((modulo) => modulo.ConfirmarEliminarItem),
)

// El panel de imágenes de un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): nada de su código viaja con la hoja (8.09-3, C14).
export const DrawerDeImagenesDiferido = diferido(() =>
  import('./drawer-de-imagenes').then((modulo) => modulo.DrawerDeImagenes),
)
