'use client'

import { diferido } from '@/shared/ui/diferido'

// Los formularios de «Agregar salida» y de «Editar» y la confirmación de quitar se piden recién al abrirse: el inspector no carga su código para mostrarse.
export const FormularioDeNuevaSalidaDiferido = diferido(() =>
  import('./formulario-de-nueva-salida').then((modulo) => modulo.FormularioDeNuevaSalida),
)

export const FormularioDeEdicionDeSalidaDiferido = diferido(() =>
  import('./formulario-de-edicion-de-salida').then((modulo) => modulo.FormularioDeEdicionDeSalida),
)

export const EliminarSalidaDiferido = diferido(() =>
  import('./eliminar-salida').then((modulo) => modulo.EliminarSalida),
)
