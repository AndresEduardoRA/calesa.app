// Las pestañas de `/repuestos/[id]` (8.09-2, C6). «Ítems» siempre; «Compras» (8.11-2) sólo con `repuestos.costos.ver`; «Cotizaciones» (8.12-3) sólo con
// `repuestos.cotizar` (quien sólo tiene `repuestos.costos.ver`, que la RLS deja leer, no la ve: D30). Una pestaña con `lleno: false` no se dibuja hasta que su paso
// la llene (una pestaña sin pantalla es un botón muerto, D28 de 8.08-3). Con una sola pestaña visible la barra no se dibuja.
// Esconder una pestaña es comodidad, no seguridad: la autoridad es la RLS y el `assert_permiso` de cada lectura.
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import type { AlMenosUna } from '../../configuracion/empresa/pestanas'

export type PestanaDelProyecto = {
  clave: string
  titulo: string
  // ¿Su paso ya la llenó?
  lleno: boolean
  // La clave que hace falta para verla, además de `repuestos.ver` (la de la página).
  permiso?: ClavePermiso
}

export const PESTANA_DE_ITEMS = 'items'

export const PESTANAS: readonly PestanaDelProyecto[] = [
  { clave: PESTANA_DE_ITEMS, titulo: 'Ítems', lleno: true },
  { clave: 'compras', titulo: 'Compras', lleno: true, permiso: 'repuestos.costos.ver' },
  { clave: 'cotizaciones', titulo: 'Cotizaciones', lleno: true, permiso: 'repuestos.cotizar' },
]

/** Las que se dibujan para quien mira, en su orden: «Ítems» siempre está. */
export function pestanasLlenas(
  permisos: Permisos,
  pestanas: readonly PestanaDelProyecto[] = PESTANAS,
): AlMenosUna<PestanaDelProyecto> {
  const llenas = pestanas.filter(
    (p) => p.lleno && (p.permiso === undefined || puede(permisos, p.permiso)),
  )
  const [primera, ...resto] = llenas
  return primera === undefined ? [PESTANAS[0] as PestanaDelProyecto] : [primera, ...resto]
}

/** Lo que viene en la URL lo escribe cualquiera: lo que no es una pestaña visible para quien mira abre «Ítems». */
export function pestanaDe(
  valor: string | undefined,
  llenas: AlMenosUna<PestanaDelProyecto>,
): string {
  return llenas.find((p) => p.clave === valor)?.clave ?? PESTANA_DE_ITEMS
}
