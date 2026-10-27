// Los orígenes donde la persona puede cotizar: una pestaña por cada uno en la hoja. Cotizar pide `cotizaciones.crear` Y `cotizaciones.ver` del origen (4-32: con sólo `crear` la hoja
// iba vacía); lo que protege es la base (`cotizacion_hoja()`, `cotizacion_evaluar()` y `cotizacion_crear()` piden los dos antes de mirar nada). Un origen desactivado no se cotiza.
import { puede, type Permisos } from '@/shared/lib/permisos'

type Origen = { id: string; activo: boolean }

// La regla de un origen: la misma que repite la action de guardar antes de llamar a la base (que vuelve a exigirla).
export const puedeCotizarEn = (permisos: Permisos, origenId: string): boolean =>
  puede(permisos, 'cotizaciones.crear', origenId) && puede(permisos, 'cotizaciones.ver', origenId)

export function origenesParaCotizar<O extends Origen>(
  permisos: Permisos,
  origenes: readonly O[],
): O[] {
  return origenes.filter((origen) => origen.activo && puedeCotizarEn(permisos, origen.id))
}

// La pestaña de la URL si es una de las suyas; si no (o si no vino), la primera.
export function origenElegido<O extends { id: string }>(
  visibles: readonly O[],
  pedido: string | undefined,
): O | null {
  return visibles.find((origen) => origen.id === pedido) ?? visibles[0] ?? null
}
