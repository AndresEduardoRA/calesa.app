// Mis turnos de la web sin confirmar (8.05-1): la forma de una fila, el contrato de la lectura y su orden. Puro: sin I/O.
import type { Resultado } from '@/shared/lib/errores'

export type EstadoDeTurno = 'asignada' | 'vencida'

export type Turno = {
  id: string
  // `#WEB-XXXX`, tal cual lo dio la base.
  codigo: string
  // Texto libre del sitio (`boton_general`, `vehiculo`…): se muestra sin catálogo.
  fuente: string
  vehiculoId: string | null
  // Nulo si el vehículo ya no es público (`web.vehiculos` sólo trae los visibles) o no hay vehículo.
  titulo: string | null
  // Nulo: contacto directo por handle, sin reloj.
  venceEn: string | null
  estado: EstadoDeTurno
}

// Pide `tope + 1` filas y devuelve hasta `tope` con si había más (nunca un total). Sólo los turnos de quien lee.
export type LectorDeMisTurnos = (pedido: {
  tope: number
}) => Promise<Resultado<{ filas: Turno[]; hayMas: boolean }>>

function aMs(iso: string): number {
  return Date.parse(iso)
}

// Primero las vigentes (`asignada`) por `vence_en` ascendente, las directas (sin reloj) al final de las vigentes; luego las `vencida`,
// de la que venció hace menos a la que venció hace más: una vencida vieja no tapa a las vigentes.
export function ordenarTurnos(asignadas: readonly Turno[], vencidas: readonly Turno[]): Turno[] {
  const vigentes = [...asignadas].sort((a, b) => {
    if (a.venceEn === null && b.venceEn === null) return a.id.localeCompare(b.id)
    if (a.venceEn === null) return 1
    if (b.venceEn === null) return -1
    return aMs(a.venceEn) - aMs(b.venceEn) || a.id.localeCompare(b.id)
  })
  const pasadas = [...vencidas].sort(
    (a, b) => aMs(b.venceEn ?? '') - aMs(a.venceEn ?? '') || a.id.localeCompare(b.id),
  )
  return [...vigentes, ...pasadas]
}
