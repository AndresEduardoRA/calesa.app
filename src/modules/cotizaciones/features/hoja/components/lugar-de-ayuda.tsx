'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja } from '../../../entities/hoja'
import type { AyudaDeLaHoja } from '../hooks/use-ayuda-de-la-hoja'
import { AyudaDeCeldaDiferida } from './diferidos'

type Props = { secciones: readonly SeccionDeHoja[]; contexto: ContextoDeHoja; ayuda: AyudaDeLaHoja }

// El panel de ayuda de un conjunto de secciones (la hoja, o el modal «Avanzado»): su código se pide la primera vez que la URL nombra una celda.
export function LugarDeAyuda(props: Props) {
  const montar = useAbiertoAlgunaVez(props.ayuda.nodo !== null)
  return montar ? <AyudaDeCeldaDiferida {...props} /> : null
}
