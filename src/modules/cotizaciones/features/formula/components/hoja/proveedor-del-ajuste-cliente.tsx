'use client'

import type { ReactNode } from 'react'
import { ContextoDelAjuste, type AjusteDeArea } from '../../../hoja/components/hueco-del-ajuste'
import { AjusteDeLaCelda } from './ajuste-de-la-celda'
import { ContextoDelOrigenDelAjuste } from './origen-del-ajuste'

// Un valor de módulo: no cambia mientras la página vive, así que ninguna celda (en `memo`) se vuelve a dibujar por él.
const AJUSTE: AjusteDeArea = { Ajuste: AjusteDeLaCelda }

// Enciende el ⚙ de las celdas en la hoja (4.20-3b): llena `ContextoDelAjuste` (el hueco del núcleo) y da el origen al panel. Sólo viaja esto y la cáscara de `diferido()`.
export function ProveedorDelAjusteCliente({
  origenId,
  children,
}: {
  origenId: string
  children: ReactNode
}) {
  return (
    <ContextoDelOrigenDelAjuste value={origenId}>
      <ContextoDelAjuste value={AJUSTE}>{children}</ContextoDelAjuste>
    </ContextoDelOrigenDelAjuste>
  )
}
