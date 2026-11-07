'use client'

import { use } from 'react'
import type { PropsDelAjuste } from '../../../hoja/components/huecos'
import { PanelDelAjusteDiferido } from './diferidos'
import { ContextoDelOrigenDelAjuste } from './origen-del-ajuste'

// El `Ajuste` que el área da a la hoja (4.20-3b): el panel del ⚙ de la celda que nombra la URL, con el origen de la hoja, por `diferido()`.
export function AjusteDeLaCelda(props: PropsDelAjuste) {
  const origenId = use(ContextoDelOrigenDelAjuste)
  return origenId === null ? null : <PanelDelAjusteDiferido {...props} origenId={origenId} />
}
