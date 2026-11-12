'use client'

import { diferido } from '@/shared/ui/diferido'

// La confirmación de eliminar un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): la hoja no carga su código para dibujarse.
export const ConfirmarEliminarItemDiferido = diferido(() =>
  import('./confirmar-eliminar-item').then((modulo) => modulo.ConfirmarEliminarItem),
)
