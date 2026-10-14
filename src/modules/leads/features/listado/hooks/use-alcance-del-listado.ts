'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { CLAVE_DE_ALCANCE, VALOR_TODOS, type ModoDelListado } from '../../../entities/alcance'

const PARAMETROS = {
  [CLAVE_DE_ALCANCE]: parseAsString,
  [CLAVE_DE_CURSOR]: parseAsString,
}

// Cambia entre «míos» y «todos» en la URL (`?alcance=todos`) y vuelve a la primera página. «Míos»
// no escribe nada: es lo de siempre. Va al servidor (`shallow: false`): la lista cambia.
export function useAlcanceDelListado() {
  const [, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return {
    cambiar: (modo: ModoDelListado) => {
      void setParametros({
        [CLAVE_DE_ALCANCE]: modo === 'todos' ? VALOR_TODOS : null,
        [CLAVE_DE_CURSOR]: null,
      })
    },
  }
}
