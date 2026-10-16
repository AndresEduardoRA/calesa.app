'use client'

import { diferido } from '@/shared/ui/diferido'

// «Dar acceso» se pide recién al abrirse: la sección «Portal» no carga su código para mostrar el
// estado del acceso. Se monta con `useAbiertoAlgunaVez()`.
export const DialogoDeOtorgarDiferido = diferido(() =>
  import('./dialogo-de-otorgar').then((modulo) => modulo.DialogoDeOtorgar),
)
