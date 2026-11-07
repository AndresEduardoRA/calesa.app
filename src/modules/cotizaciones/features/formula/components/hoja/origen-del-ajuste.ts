'use client'

import { createContext } from 'react'

// El origen de la hoja para el panel del ⚙ (4.20-3b): la hoja no se lo da (`PropsDelAjuste` no lo trae) y la lectura del valor por defecto y el cambio lo piden. Lo pone
// `ProveedorDelAjusteCliente`; sin él, el ⚙ no se enciende.
export const ContextoDelOrigenDelAjuste = createContext<string | null>(null)
