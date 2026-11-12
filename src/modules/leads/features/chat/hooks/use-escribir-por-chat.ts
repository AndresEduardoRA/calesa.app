'use client'
import { useContext } from 'react'
import { EscribirPorChatContexto } from '../components/proveedor-de-escribir-por-chat'

// ¿Quien mira puede escribir por chat? Lo decide el layout (`chat.participar`); fuera del proveedor, no.
export function useEscribirPorChat(): boolean {
  return useContext(EscribirPorChatContexto)
}
