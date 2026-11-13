'use client'

import { diferido } from '@/shared/ui/diferido'

// El cuerpo del drawer de un cambio llega recién al abrirse: la lista de la actividad no carga su lectura ni su presentación para mostrar sus filas.
export const CuerpoDelCambioDiferido = diferido(() =>
  import('./cuerpo-del-cambio').then((modulo) => modulo.CuerpoDelCambio),
)
