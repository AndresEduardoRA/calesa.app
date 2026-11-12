'use client'
import { createContext, type ReactNode } from 'react'

export const EscribirPorChatContexto = createContext(false)

// Un booleano del layout: `leads` no importa `chat`, sólo sabe si ofrecer el enlace «Escribirle por chat».
export function ProveedorDeEscribirPorChat({
  habilitado,
  children,
}: {
  habilitado: boolean
  children: ReactNode
}) {
  return <EscribirPorChatContexto value={habilitado}>{children}</EscribirPorChatContexto>
}
