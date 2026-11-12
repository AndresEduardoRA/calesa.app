'use client'

import type { ConteoAcotado } from '@/shared/lib/conteo'
import { useSuscripcionDeLaCampana } from '../hooks/use-suscripcion-de-la-campana'

type Props = {
  usuarioId: string
  alConteo: (conteo: ConteoAcotado) => void
  alSenal: () => void
}

// No dibuja nada: lleva el contador y Realtime. Va aparte (y diferido, `diferidos.tsx`) porque trae el cliente de
// Supabase del navegador, y el botón de la campana está en el marco de toda pantalla: sin esto, cada pantalla
// pagaba ese cliente en su JS en frío (7.02-2: /cotizaciones pasó de 358 a 424 KB).
export function SuscripcionDeLaCampana({ usuarioId, alConteo, alSenal }: Props) {
  useSuscripcionDeLaCampana(usuarioId, alConteo, alSenal)
  return null
}
