'use client'

import dynamic from 'next/dynamic'

// «Dar acceso» se pide recién al abrirse: la sección «Portal» no carga su código para mostrar el
// estado del acceso. Se monta con `useAbiertoAlgunaVez()`.
export const DialogoDeOtorgarDiferido = dynamic(
  () => import('./dialogo-de-otorgar').then((modulo) => modulo.DialogoDeOtorgar),
  { ssr: false },
)
