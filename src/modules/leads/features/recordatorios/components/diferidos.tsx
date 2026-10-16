'use client'

import dynamic from 'next/dynamic'

// El modal de agendar y editar se pide recién al abrirse: «Seguimientos» no carga su código para
// mostrar la lista. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeRecordatorioDiferido = dynamic(
  () => import('./modal-de-recordatorio').then((modulo) => modulo.ModalDeRecordatorio),
  { ssr: false },
)
