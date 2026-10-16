'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { CLAVE_DE_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import {
  CLAVE_DE_PESTANA,
  hayModalEnLaPestana,
  pestanaDelRapido,
  type PestanaDelRapido,
} from '../../../entities/rapido'
import { CLAVE_DE_RECORDATORIO } from '../../../entities/recordatorios'

// Qué lead está abierto en el drawer rápido, en la URL (`?lead=`), y en qué pestaña (`?pestana=`):
// sobrevive a recargar y se puede compartir. Abrir suma al historial («atrás» lo cierra) y empieza
// en «Resumen»; cambiar de pestaña no suma (así «atrás» cierra el drawer). Sin `shallow: false`:
// abrirlo no pide nada al servidor; el drawer lee su lead por su cuenta.
export const CLAVE_DE_LEAD = 'lead'

const PARAMETROS = {
  [CLAVE_DE_LEAD]: parseAsString,
  [CLAVE_DE_PESTANA]: parseAsString,
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_SEGUIMIENTO]: parseAsString,
  [CLAVE_DE_RECORDATORIO]: parseAsString,
}

// Lo de la pestaña que se va con ella (un modal que quedó en la URL no salta al volver).
const SIN_MODAL = {
  [CLAVE_DE_PANEL]: null,
  [CLAVE_DE_SEGUIMIENTO]: null,
  [CLAVE_DE_RECORDATORIO]: null,
}

export function useDrawerDeLead() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const pestana = pestanaDelRapido(parametros[CLAVE_DE_PESTANA])
  return {
    id: parametros[CLAVE_DE_LEAD],
    pestana,
    // Un modal de la pestaña abierto: el drawer no vuelve a leer su lead.
    conModal: hayModalEnLaPestana(pestana, parametros[CLAVE_DE_PANEL]),
    abrir: (leadId: string) => {
      void setParametros({ [CLAVE_DE_LEAD]: leadId, [CLAVE_DE_PESTANA]: null }, { history: 'push' })
    },
    elegirPestana: (pestana: PestanaDelRapido) => {
      void setParametros({
        [CLAVE_DE_PESTANA]: pestana === 'resumen' ? null : pestana,
        ...SIN_MODAL,
      })
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_LEAD]: null, [CLAVE_DE_PESTANA]: null, ...SIN_MODAL })
    },
  }
}
