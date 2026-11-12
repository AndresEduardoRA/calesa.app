'use client'

import { diferido } from '@/shared/ui/diferido'

// Los huecos «Gastos», «Pagos» y «Margen» se piden recién al abrir su bloque (`BloqueDelHueco` no los monta antes): el panel de la unidad no carga el código del formulario, la lista ni el margen
// para dibujarse. Un hueco recibe sólo `{ unidad }`.
export const HuecoDeGastosDiferido = diferido(() =>
  import('./hueco-de-gastos').then((modulo) => modulo.HuecoDeGastos),
)

export const HuecoDePagosDiferido = diferido(() =>
  import('./hueco-de-pagos').then((modulo) => modulo.HuecoDePagos),
)

export const HuecoDeMargenDiferido = diferido(() =>
  import('./hueco-de-margen').then((modulo) => modulo.HuecoDeMargen),
)

// El hueco de prorrateo del resumen de un grupo (6.11-4): también se pide al abrir su bloque.
export const HuecoDeProrrateoDiferido = diferido(() =>
  import('./hueco-de-prorrateo').then((modulo) => modulo.HuecoDeProrrateo),
)
