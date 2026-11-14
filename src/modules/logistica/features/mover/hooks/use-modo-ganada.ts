'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { CLAVE_DE_GANADA, VALOR_DE_GANADA } from '../../../entities/mover/ganada'

const PARAMETRO = parseAsStringLiteral([VALOR_DE_GANADA]).withOptions({ shallow: false })

// El modo «La ganamos» del hueco «Qué falta» vive en la URL (`?ganada=si`). Quitarlo con `shallow: false` repinta el servidor: tras ganar no hace
// falta además un `router.refresh()` (dos repintados en la misma pasada se pisan).
export function useModoGanada() {
  const [valor, setValor] = useQueryState(CLAVE_DE_GANADA, PARAMETRO)
  return {
    activo: valor === VALOR_DE_GANADA,
    activar: () => {
      void setValor(VALOR_DE_GANADA)
    },
    quitar: () => {
      void setValor(null)
    },
  }
}

export type ModoGanada = ReturnType<typeof useModoGanada>
