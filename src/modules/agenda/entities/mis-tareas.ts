// «Mis tareas» de la bandeja de inicio (7.07-3): mis tareas pendientes, las que vencen primero arriba y las sin fecha al final. Puro: la forma de una fila, el
// contrato de la lectura y cuándo una tarea está vencida.
import type { Resultado } from '@/shared/lib/errores'

export type TareaPendiente = {
  id: string
  titulo: string
  // Nulo: sin fecha.
  venceEn: string | null
}

// Pide `tope + 1` filas y devuelve hasta `tope` con si había más (nunca un total).
export type LectorDeMisTareas = (pedido: {
  tope: number
}) => Promise<Resultado<{ filas: TareaPendiente[]; hayMas: boolean }>>

// Una tarea sin fecha no vence; la hora exacta todavía no pasó.
export function estaVencida(venceEn: string | null, ahoraIso: string): boolean {
  return venceEn !== null && Date.parse(venceEn) < Date.parse(ahoraIso)
}
