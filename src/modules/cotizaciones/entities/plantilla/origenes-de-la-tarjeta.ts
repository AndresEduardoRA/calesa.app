// Los orígenes donde la persona configura la tarjeta (4.19-3b): `cotizaciones.configurar` de ese origen, en el orden del catálogo y también los inactivos (su
// plantilla se sigue pudiendo mirar). Lo que protege es la base (la policy de `plantillas_tarjeta` pide la misma clave). Rehecho aquí y no importado del área `formula`.
import { puede, type Permisos } from '@/shared/lib/permisos'

export function origenesDeLaTarjeta<O extends { id: string }>(
  permisos: Permisos,
  origenes: readonly O[],
): O[] {
  return origenes.filter((origen) => puede(permisos, 'cotizaciones.configurar', origen.id))
}

export const etiquetaDelOrigen = (origen: { nombre: string; activo: boolean }): string =>
  origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`
