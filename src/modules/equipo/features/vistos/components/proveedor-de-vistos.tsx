'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { VISTOS_POR_DEFECTO, type PreferenciaDeVistos } from '../../../entities/vistos'

const Contexto = createContext<PreferenciaDeVistos>(VISTOS_POR_DEFECTO)

// La preferencia de «Vistos» de la persona, para toda lista (la monta `ProveedorPreferencias` con lo de la sesión).
export function ProveedorDeVistos({
  preferencia,
  children,
}: {
  preferencia: PreferenciaDeVistos
  children: ReactNode
}) {
  return <Contexto value={preferencia}>{children}</Contexto>
}

export function usePreferenciaDeVistos(): PreferenciaDeVistos {
  return useContext(Contexto)
}
