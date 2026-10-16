'use client'

import dynamic from 'next/dynamic'

// «Agregar teléfono» se pide recién al abrirse: «Datos» no carga su código para mostrar la lista. Se
// monta con `useAbiertoAlgunaVez()`.
export const ModalDeExtraDiferido = dynamic(
  () => import('./modal-de-extra').then((modulo) => modulo.ModalDeExtra),
  { ssr: false },
)
