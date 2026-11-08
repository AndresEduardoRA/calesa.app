'use client'

import { diferido } from '@/shared/ui/diferido'

// La pestaña «Diseño» (4.22-2) trae el validador del diseño y el editor: Configuración › Cotización no los carga para mostrar sus otras pestañas.
export const DisenoDelOrigenDiferido = diferido(
  () => import('./diseno-del-origen').then((modulo) => modulo.DisenoDelOrigen),
  { aviso: 'aqui' },
)

// La pestaña «Tonos» (4.22-4): el catálogo y su modal se piden al abrirla; Configuración › Cotización no los carga para mostrar sus otras pestañas.
export const TonosDelCatalogoDiferido = diferido(
  () => import('./tonos-del-catalogo').then((modulo) => modulo.TonosDelCatalogo),
  { aviso: 'aqui' },
)

// «Nuevo tono» y «Editar tono» se piden recién al abrirse (`useAbiertoAlgunaVez()`): la lista no carga el formulario para mostrarse.
export const ModalDeTonoDiferido = diferido(() =>
  import('./modal-de-tono').then((modulo) => modulo.ModalDeTono),
)

// La confirmación de eliminar un tono se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarTonoDiferido = diferido(() =>
  import('./eliminar-tono').then((modulo) => modulo.EliminarTono),
)
