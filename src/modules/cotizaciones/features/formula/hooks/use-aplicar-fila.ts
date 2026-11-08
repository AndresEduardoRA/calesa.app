'use client'

import { useCallback } from 'react'
import type { Formula } from '../../../entities/formula'
import { compilarFila } from '../../../entities/formula/compilar-fila'
import type { Aplicada, FilaAbierta } from './use-editor-de-la-formula'

// «Aplicar» de la fila abierta (4.21-3a-1): compila su texto con `compilarFila()` (4.21-1). Un error (del compilador, del sitio, el de 2.001 caracteres, una auxiliar que
// otra fila nombra) deja la fila abierta con su error y la fórmula igual; `pisa_un_valor` (4-5) espera «Pisar el valor». Si entra, la fórmula de trabajo pasa a la nueva y la fila se cierra diciendo lo soltado.
export function useAplicarFila({
  trabajo,
  abierta,
  enCurso,
  setTrabajo,
  setAbierta,
  setAplicada,
}: {
  trabajo: Formula
  abierta: FilaAbierta | null
  enCurso: boolean
  // Los `set` de `useState` del editor: estables, para que `aplicar` no cambie en cada render (cada `FilaDelEditor` es `memo`).
  setTrabajo: (formula: Formula) => void
  setAbierta: (abierta: FilaAbierta | null) => void
  setAplicada: (aplicada: Aplicada) => void
}) {
  return useCallback(
    (texto: string, confirmaPisar = false) => {
      if (abierta === null || enCurso) return
      const r = compilarFila(trabajo, {
        destino: { existente: abierta.id },
        texto,
        confirmaPisar,
      })
      if (!r.ok) {
        setAbierta({ id: abierta.id, error: r.error })
        return
      }
      setTrabajo(r.formula)
      setAbierta(null)
      setAplicada({ id: abierta.id, soltados: r.soltados })
    },
    [abierta, trabajo, enCurso, setTrabajo, setAbierta, setAplicada],
  )
}
