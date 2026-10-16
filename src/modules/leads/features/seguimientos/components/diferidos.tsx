'use client'

import dynamic from 'next/dynamic'

// El modal de anotar y editar se pide recién al abrirse (y con él, el editor): la línea de tiempo no
// carga su código para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeSeguimientoDiferido = dynamic(
  () => import('./modal-de-seguimiento').then((modulo) => modulo.ModalDeSeguimiento),
  { ssr: false },
)
