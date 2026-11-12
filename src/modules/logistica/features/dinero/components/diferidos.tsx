'use client'

import { diferido } from '@/shared/ui/diferido'

// El hueco «Gastos» se pide recién al abrir su bloque (`BloqueDelHueco` no los monta antes): el panel de la unidad no carga el código del formulario, la lista
// para dibujarse. Un hueco recibe sólo `{ unidad }`.
export const HuecoDeGastosDiferido = diferido(() =>
  import('./hueco-de-gastos').then((modulo) => modulo.HuecoDeGastos),
)
