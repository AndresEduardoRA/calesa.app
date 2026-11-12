'use client'

import { useSuscripcionDeNoLeidos } from '../hooks/use-suscripcion-de-no-leidos'

// No dibuja nada: lleva el contador y Realtime. Va aparte y diferido (`diferidos.tsx`) porque trae el cliente de Supabase del navegador, y la burbuja está en el
// marco de toda pantalla (como la campana, 7.02-2).
export function SuscripcionDeNoLeidos({ usuarioId }: { usuarioId: string }) {
  useSuscripcionDeNoLeidos(usuarioId)
  return null
}
