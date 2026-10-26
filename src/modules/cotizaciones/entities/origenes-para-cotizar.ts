// Los orígenes donde la persona puede cotizar: una pestaña por cada uno en la hoja. Cotizar pide `cotizaciones.crear` Y `cotizaciones.ver` del origen (4-32: con sólo `crear` la hoja
// iba vacía); lo que protege es la base (`cotizacion_hoja()`, `cotizacion_evaluar()` y `cotizacion_crear()` piden los dos antes de mirar nada). Un origen desactivado no se cotiza.
import { origenesCon, type Permisos } from '@/shared/lib/permisos'

type Origen = { id: string; activo: boolean }

export function origenesParaCotizar<O extends Origen>(
  permisos: Permisos,
  origenes: readonly O[],
): O[] {
  const crear = origenesCon(permisos, 'cotizaciones.crear')
  const ver = origenesCon(permisos, 'cotizaciones.ver')
  const vale = (donde: 'todos' | string[], id: string) => donde === 'todos' || donde.includes(id)
  return origenes.filter(
    (origen) => origen.activo && vale(crear, origen.id) && vale(ver, origen.id),
  )
}

// La pestaña de la URL si es una de las suyas; si no (o si no vino), la primera.
export function origenElegido<O extends { id: string }>(
  visibles: readonly O[],
  pedido: string | undefined,
): O | null {
  return visibles.find((origen) => origen.id === pedido) ?? visibles[0] ?? null
}
