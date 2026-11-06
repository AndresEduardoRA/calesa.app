'use client'

import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja } from '../../../entities/hoja'
import { celdaConAjuste } from '../../../entities/presentacion-de-la-hoja'
import type { AjusteEnLaHoja } from './huecos'

type Props = {
  secciones: readonly SeccionDeHoja[]
  contexto: ContextoDeHoja
  ajuste: AjusteEnLaHoja
}

// El panel de ajuste de un conjunto de secciones (la hoja, o el modal «Avanzado»), si la URL nombra una de sus celdas con ⚙ y se dibuja ahora: la URL no abre lo que la hoja no
// enseña. Lo dibuja el `Ajuste` que llenó el área.
export function LugarDelAjuste({ secciones, contexto, ajuste }: Props) {
  const celda = celdaConAjuste(secciones, ajuste.nodo, contexto)
  return celda === null ? null : (
    <ajuste.Ajuste celda={celda} cerrar={ajuste.cerrar} hoja={ajuste.hoja} />
  )
}
