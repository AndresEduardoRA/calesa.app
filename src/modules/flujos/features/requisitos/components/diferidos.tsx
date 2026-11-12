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

export const FormularioDeEdicionDiferido = diferido(() =>
  import('./formulario-de-edicion').then((modulo) => modulo.FormularioDeEdicion),
)

export const EliminarRequisitoDiferido = diferido(() =>
  import('./eliminar-requisito').then((modulo) => modulo.EliminarRequisito),
)

// El panel de «fuera de regla» (`?panel=fuera-de-regla`) se pide recién al abrirse.
export const PanelDeFueraDeReglaDiferido = diferido(() =>
  import('./panel-de-fuera-de-regla').then((modulo) => modulo.PanelDeFueraDeRegla),
)
