'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { CambiosDeLead } from '../../../entities/edicion'
import { guardarLead } from '../actions/guardar-lead'
import { MENSAJE_DE_VALIDACION } from '../resultado'

// La escritura de la ficha. Distingue un pedido que no llegó al servidor (se puede reintentar tal
// cual: guardar lo ya guardado no es un conflicto) de un error del servidor.
export function useGuardarLead() {
  const accion = useAction(guardarLead)
  return {
    guardar: (pedido: { id: string; actualizadoEnEsperado: string; cambios: CambiosDeLead }) =>
      enviarAccion<{ actualizadoEn: string }>(accion.executeAsync(pedido), MENSAJE_DE_VALIDACION),
    enCurso: accion.isPending,
  }
}
