// Los orígenes donde la persona puede cotizar: una pestaña por cada uno en la hoja. Espejo de `origenes_con_permiso('cotizaciones.crear')`; lo que protege es la base
// (`cotizacion_hoja()` pide ese permiso antes de mirar nada). Un origen desactivado no se cotiza.
import { origenesCon, type Permisos } from '@/shared/lib/permisos'

type Origen = { id: string; activo: boolean }

export function origenesParaCotizar<O extends Origen>(
  permisos: Permisos,
  origenes: readonly O[],
): O[] {
  const donde = origenesCon(permisos, 'cotizaciones.crear')
  return origenes.filter(
    (origen) => origen.activo && (donde === 'todos' || donde.includes(origen.id)),
  )
}

// La pestaña de la URL si es una de las suyas; si no (o si no vino), la primera.
export function origenElegido<O extends { id: string }>(
  visibles: readonly O[],
  pedido: string | undefined,
): O | null {
  return visibles.find((origen) => origen.id === pedido) ?? visibles[0] ?? null
}
