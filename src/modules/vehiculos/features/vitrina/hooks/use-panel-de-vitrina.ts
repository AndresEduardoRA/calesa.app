'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { PANEL_DE_VITRINA } from '../claves'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString }

// El panel de publicar vive en la URL de la ficha (`?panel=vitrina`): sobrevive a recargar y
// «atrás» lo cierra.
export function usePanelDeVitrina() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return {
    abierto: parametros[CLAVE_DE_PANEL] === PANEL_DE_VITRINA,
    abrir: () => {
      void setParametros({ [CLAVE_DE_PANEL]: PANEL_DE_VITRINA }, { history: 'push' })
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null })
    },
  }
}
