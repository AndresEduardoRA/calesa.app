'use client'

import type { ReactNode } from 'react'
import type { Perspectiva } from '../../../entities/perspectiva'
import { ContextoPerspectiva } from '../contexto'

type Props = { perspectiva: Perspectiva; children: ReactNode }

// Reparte la perspectiva de la sesión a los Client Components (`usePerspectiva()`). La pone el
// layout de la app, que es quien lee la sesión.
export function ProveedorPerspectiva({ perspectiva, children }: Props) {
  return <ContextoPerspectiva value={perspectiva}>{children}</ContextoPerspectiva>
}
