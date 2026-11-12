'use client'

import { useState } from 'react'
import type {
  CampoDeTransporte,
  ValoresDeTransporte,
} from '../../../entities/transporte/transporte'

// Lo escrito en el formulario del transporte: sólo los campos **tocados**, no una copia de la fila (6.08-2, D15). Tras un conflicto «Recargar» trae la versión nueva y lo tocado sigue; tras
// guardar, lo escrito se suelta cuando llega la versión nueva (no antes: se vería un instante lo viejo).
export function useBorradorDeTransporte(version: string | null) {
  const [borrador, setBorrador] = useState<Partial<ValoresDeTransporte>>({})
  const [soltarAlLlegar, setSoltarAlLlegar] = useState(false)
  const [versionVista, setVersionVista] = useState(version)
  if (versionVista !== version) {
    setVersionVista(version)
    if (soltarAlLlegar) {
      setSoltarAlLlegar(false)
      setBorrador({})
    }
  }
  return {
    borrador,
    tocar: (campo: CampoDeTransporte, valor: string) => {
      setBorrador((antes) => ({ ...antes, [campo]: valor }))
    },
    soltarYa: () => {
      setBorrador({})
    },
    soltarAlLlegar: () => {
      setSoltarAlLlegar(true)
    },
  }
}
