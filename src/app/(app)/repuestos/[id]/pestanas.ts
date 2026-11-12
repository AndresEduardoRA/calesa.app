// Las pestañas de `/repuestos/[id]` (8.09-2, C6). Hoy hay una sola, «Ítems»; «Compras» (8.11) y «Cotizaciones» (8.12) son huecos: están acá como datos con `lleno: false` y no se dibujan
// hasta que su paso las llene (una pestaña sin pantalla es un botón muerto, D28 de 8.08-3). Cuando su paso cambie `lleno` a `true`, aparece la barra. Con una sola pestaña llena la barra no se dibuja.
import type { AlMenosUna } from '../../configuracion/empresa/pestanas'

export type PestanaDelProyecto = {
  clave: string
  titulo: string
  // ¿Su paso ya la llenó?
  lleno: boolean
}

export const PESTANA_DE_ITEMS = 'items'

export const PESTANAS: readonly PestanaDelProyecto[] = [
  { clave: PESTANA_DE_ITEMS, titulo: 'Ítems', lleno: true },
  // 8.11 las llena con las compras y su permiso de costos.
  { clave: 'compras', titulo: 'Compras', lleno: false },
  // 8.12 las llena con las cotizaciones de repuestos.
  { clave: 'cotizaciones', titulo: 'Cotizaciones', lleno: false },
]

/** Las que se dibujan, en su orden: «Ítems» siempre está. */
export function pestanasLlenas(
  pestanas: readonly PestanaDelProyecto[] = PESTANAS,
): AlMenosUna<PestanaDelProyecto> {
  const llenas = pestanas.filter((p) => p.lleno)
  const [primera, ...resto] = llenas
  return primera === undefined ? [PESTANAS[0] as PestanaDelProyecto] : [primera, ...resto]
}

/** Lo que viene en la URL lo escribe cualquiera: lo que no es una pestaña llena abre «Ítems». */
export function pestanaDe(
  valor: string | undefined,
  pestanas: readonly PestanaDelProyecto[] = PESTANAS,
): string {
  return pestanasLlenas(pestanas).find((p) => p.clave === valor)?.clave ?? PESTANA_DE_ITEMS
}
