'use client'

import { diferido } from '@/shared/ui/diferido'

// Los huecos «Gastos» y «Margen» se piden recién al abrir su bloque (`BloqueDelHueco` no los monta antes): el panel de la unidad no carga el código del formulario, la lista ni el margen
// para dibujarse. Un hueco recibe sólo `{ unidad }`.
export const HuecoDeGastosDiferido = diferido(() =>
  import('./hueco-de-gastos').then((modulo) => modulo.HuecoDeGastos),
)

export const HuecoDeMargenDiferido = diferido(() =>
  import('./hueco-de-margen').then((modulo) => modulo.HuecoDeMargen),
)
