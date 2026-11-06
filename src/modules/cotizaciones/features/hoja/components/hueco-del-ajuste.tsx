'use client'

import { createContext, type ComponentType } from 'react'
import type { PropsDelAjuste } from './huecos'

// El hueco del ⚙ (4.15-6a): el `Proveedor` de un área (el del 4.20) lo llena con el panel que abre el ⚙ de una celda. Sin proveedor es nulo y la hoja no dibuja ningún ⚙ ni
// monta ningún hook del ajuste. La hoja no decide quién lo ve: la base lo dice por celda (`ajustes`).
export type AjusteDeArea = { Ajuste: ComponentType<PropsDelAjuste> }

export const ContextoDelAjuste = createContext<AjusteDeArea | null>(null)
