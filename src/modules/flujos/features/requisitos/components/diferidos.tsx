'use client'

import { diferido } from '@/shared/ui/diferido'

// El formulario de «Agregar requisito» y la confirmación de quitar se piden recién al abrirse: el inspector no carga su código para mostrarse. Se montan con
// `useAbiertoAlgunaVez()`.
export const FormularioDeDatoDiferido = diferido(() =>
  import('./formulario-de-dato').then((modulo) => modulo.FormularioDeDato),
)

export const EliminarRequisitoDiferido = diferido(() =>
  import('./eliminar-requisito').then((modulo) => modulo.EliminarRequisito),
)
