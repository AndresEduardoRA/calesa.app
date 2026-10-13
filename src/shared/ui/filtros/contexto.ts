'use client'

import { createContext, use } from 'react'
import type { Filtros } from './use-filtros'

export const ContextoDeFiltros = createContext<Filtros | null>(null)

// Los filtros del listado que envuelve `<FilterShell>`: lo que la lista necesita para ofrecer
// «Limpiar filtros» cuando nada coincide, o para saber que se está volviendo a pedir.
export function useFiltrosDelListado(): Filtros {
  const filtros = use(ContextoDeFiltros)
  if (!filtros) {
    throw new Error('useFiltrosDelListado() va dentro de <FilterShell>.')
  }
  return filtros
}
