'use client'

import { diferido } from '@/shared/ui/diferido'

// El formulario de «Agregar salida» y la confirmación de quitar se piden recién al abrirse: el inspector no carga su código para mostrarse.
export const FormularioDeNuevaSalidaDiferido = diferido(() =>
  import('./formulario-de-nueva-salida').then((modulo) => modulo.FormularioDeNuevaSalida),
)

export const EliminarSalidaDiferido = diferido(() =>
  import('./eliminar-salida').then((modulo) => modulo.EliminarSalida),
)
