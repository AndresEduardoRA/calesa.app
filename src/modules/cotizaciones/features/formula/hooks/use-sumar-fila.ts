'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Formula } from '../../../entities/formula'
import {
  ocupadosDe,
  sumarFila,
  type ErrorDeFilaNueva,
  type PedidoDeFilaNueva,
} from '../../../entities/formula/fila-nueva'

export type FilaSumando = { tras: string; error: ErrorDeFilaNueva | null }

// «Sumar fila» del editor (4.21-3a-2, C5 y C6): hay una sola cosa abierta a la vez (aquí el formulario; `hayAbierta` es la fila en edición). `crear` compila con
// `sumarFila()`: un error deja el formulario abierto, con su error junto a su campo; si entra, la fórmula de trabajo pasa a la nueva (`alCrear`) y `creada` dice
// qué fila nació, para llevarle el foco y no esconderla con «Buscar fila».
export function useSumarFila({
  trabajo,
  hayAbierta,
  alCrear,
}: {
  trabajo: Formula
  hayAbierta: boolean
  alCrear: (formula: Formula, creada: { id: string; soltados: string[] }) => void
}) {
  const [sumando, setSumando] = useState<FilaSumando | null>(null)
  const [creada, setCreada] = useState<string | null>(null)
  const ocupados = useMemo(() => ocupadosDe(trabajo), [trabajo])

  const crear = useCallback(
    (pedido: Omit<PedidoDeFilaNueva, 'despuesDe'>) => {
      if (sumando === null) return
      const r = sumarFila(trabajo, { ...pedido, despuesDe: sumando.tras })
      if (!r.ok) {
        setSumando({ tras: sumando.tras, error: r.error })
        return
      }
      alCrear(r.formula, { id: pedido.id, soltados: r.soltados })
      setSumando(null)
      setCreada(pedido.id)
    },
    [sumando, trabajo, alCrear],
  )

  return {
    sumando,
    creada,
    ocupados,
    sumar: (tras: string) => {
      if (!hayAbierta && sumando === null) {
        setCreada(null)
        setSumando({ tras, error: null })
      }
    },
    cancelarSumar: () => {
      setSumando(null)
    },
    soltarLaCreada: () => {
      setCreada(null)
    },
    crear,
  }
}
