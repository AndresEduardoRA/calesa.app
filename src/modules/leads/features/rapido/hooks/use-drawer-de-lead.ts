'use client'

import { parseAsString, useQueryState } from 'nuqs'

// Qué lead está abierto en el drawer rápido, en la URL (`?lead=`): sobrevive a recargar y se puede
// compartir. Abrir suma al historial («atrás» lo cierra). Sin `shallow: false`: abrirlo no pide
// nada al servidor; el drawer lee su lead por su cuenta.
export const CLAVE_DE_LEAD = 'lead'

export function useDrawerDeLead() {
  const [id, setId] = useQueryState(CLAVE_DE_LEAD, parseAsString)
  return {
    id,
    abrir: (leadId: string) => {
      void setId(leadId, { history: 'push' })
    },
    cerrar: () => {
      void setId(null)
    },
  }
}
