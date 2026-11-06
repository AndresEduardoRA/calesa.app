'use client'

import { useMemo, type ComponentType } from 'react'
import { useAjusteDeLaHoja } from '../hooks/use-ajuste-de-la-hoja'
import type { PropsDelAjuste } from './huecos'
import { LugaresDibujados, type PropsDeLosLugares } from './lugares-de-la-hoja'

type Props = Omit<PropsDeLosLugares, 'ajuste' | 'alAjustar'> & {
  Ajuste: ComponentType<PropsDelAjuste>
  formula: { id: string; version: number }
  alRecargar: () => void
}

// Los lugares de la hoja con el ⚙ de las celdas encendido: sólo se monta con proveedor del ajuste, y es quien guarda en la URL cuál se abre (`useAjusteDeLaHoja`). Sin
// proveedor no se llama ese hook.
export function LugaresConAjuste({ Ajuste, formula, alRecargar, ...props }: Props) {
  const { abierto, alAjustar } = useAjusteDeLaHoja()
  const { acciones, de } = props
  const hoja = useMemo(
    () => ({ de, formula, alConfirmar: acciones.alConfirmar, alRecargar }),
    [de, formula, acciones.alConfirmar, alRecargar],
  )
  return (
    <LugaresDibujados
      {...props}
      ajuste={{ Ajuste, nodo: abierto.nodo, cerrar: abierto.cerrar, hoja }}
      alAjustar={alAjustar}
    />
  )
}
