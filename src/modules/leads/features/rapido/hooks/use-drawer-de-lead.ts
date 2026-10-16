'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PESTANA, pestanaDelRapido, type PestanaDelRapido } from '../../../entities/rapido'

// Qué lead está abierto en el drawer rápido, en la URL (`?lead=`), y en qué pestaña (`?pestana=`):
// sobrevive a recargar y se puede compartir. Abrir suma al historial («atrás» lo cierra) y empieza
// en «Resumen»; cambiar de pestaña no suma (así «atrás» cierra el drawer). Sin `shallow: false`:
// abrirlo no pide nada al servidor; el drawer lee su lead por su cuenta.
export const CLAVE_DE_LEAD = 'lead'

const PARAMETROS = { [CLAVE_DE_LEAD]: parseAsString, [CLAVE_DE_PESTANA]: parseAsString }

export function useDrawerDeLead() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  return {
    id: parametros[CLAVE_DE_LEAD],
    pestana: pestanaDelRapido(parametros[CLAVE_DE_PESTANA]),
    abrir: (leadId: string) => {
      void setParametros({ [CLAVE_DE_LEAD]: leadId, [CLAVE_DE_PESTANA]: null }, { history: 'push' })
    },
    elegirPestana: (pestana: PestanaDelRapido) => {
      void setParametros({ [CLAVE_DE_PESTANA]: pestana === 'resumen' ? null : pestana })
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_LEAD]: null, [CLAVE_DE_PESTANA]: null })
    },
  }
}
