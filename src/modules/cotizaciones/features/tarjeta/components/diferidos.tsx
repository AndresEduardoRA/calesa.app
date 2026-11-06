'use client'

import { diferido } from '@/shared/ui/diferido'

// La vista previa de la tarjeta se pide recién al abrirse: la hoja no carga el modal, la tarjeta ni su lectura para dibujarse. Se monta con `useAbiertoAlgunaVez()`.
export const VistaPreviaDiferida = diferido(() =>
  import('./vista-previa-de-la-tarjeta').then((modulo) => modulo.default),
)
