'use client'

import { diferido } from '@/shared/ui/diferido'

// El inspector se pide recién al abrirse la primera vez (`useAbiertoAlgunaVez()`): la lista no carga su código para mostrar las fases.
export const InspectorDeFaseDiferido = diferido(() =>
  import('./inspector-de-fase').then((modulo) => modulo.InspectorDeFase),
)
