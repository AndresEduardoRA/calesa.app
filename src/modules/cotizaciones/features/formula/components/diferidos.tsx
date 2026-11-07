'use client'

import { diferido } from '@/shared/ui/diferido'

// «Publicar el borrador» se pide recién al abrirse: la pestaña no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDePublicarDiferido = diferido(() =>
  import('./modal-de-publicar').then((modulo) => modulo.ModalDePublicar),
)

// «Revertir a la versión N», igual.
export const ModalDeRevertirDiferido = diferido(() =>
  import('./modal-de-revertir').then((modulo) => modulo.ModalDeRevertir),
)

// «Descartar el borrador de <autor>» (4.20-2c), igual.
export const DescartarBorradorDiferido = diferido(() =>
  import('./descartar-borrador').then((modulo) => modulo.DescartarBorrador),
)

// El editor de la fórmula en texto (4.21-3a-1): ocupa el lugar de las tarjetas y la lista, y trae el compilador y el validador, que la pestaña no carga para mostrarse.
export const EditorDeLaFormulaDiferido = diferido(
  () => import('./editor/editor-de-la-formula').then((modulo) => modulo.EditorDeLaFormula),
  { aviso: 'aqui' },
)
