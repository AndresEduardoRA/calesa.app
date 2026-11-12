'use client'

import { diferido } from '@/shared/ui/diferido'

// Los formularios de «Agregar requisito» y «Editar» y la confirmación de quitar se piden recién al abrirse: el inspector no carga su código para mostrarse.
export const FormularioDeDatoDiferido = diferido(() =>
  import('./formulario-de-dato').then((modulo) => modulo.FormularioDeDato),
)

export const FormularioDeDocumentoDiferido = diferido(() =>
  import('./formulario-de-documento').then((modulo) => modulo.FormularioDeDocumento),
)

export const FormularioDeEsperaDiferido = diferido(() =>
  import('./formulario-de-espera').then((modulo) => modulo.FormularioDeEspera),
)

export const EliminarRequisitoDiferido = diferido(() =>
  import('./eliminar-requisito').then((modulo) => modulo.EliminarRequisito),
)
