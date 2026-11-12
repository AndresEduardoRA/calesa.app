// La vista «Stock» de `/repuestos` (8.10-3, C7): `?vista=stock` y sus paneles. Puro. Las claves las comparten el servidor (qué vista lee la página) y el navegador (qué panel
// abre la fila).
import { RUTAS } from '@/shared/lib/rutas'
import type { FilaDeStock } from './listado'
import { CLAVE_DE_ITEM_DE_STOCK, PANEL_STOCK } from './paneles'

export const CLAVE_DE_VISTA_DE_REPUESTOS = 'vista'
export const VISTA_DE_STOCK = 'stock'

export const PANEL_REASIGNAR_STOCK = 'reasignar-stock'
export const PANEL_VENDER_STOCK = 'vender-stock'
export const PANEL_DEVOLVER_STOCK = 'devolver-stock'
export const MENSAJE_YA_NO_ESTA_EN_STOCK = 'Ese ítem ya no está en stock.'

/** `?vista=stock` elige la vista «Stock»; cualquier otra cosa (o nada) es «Proyectos». */
export function esVistaDeStock(texto: string | null | undefined): boolean {
  return texto === VISTA_DE_STOCK
}

/** El ítem en la hoja de su proyecto, con su panel de stock abierto (el historial y «Pasar a stock», 8.10-2). */
export function rutaDelStockDelItem(fila: Pick<FilaDeStock, 'id' | 'proyectoId'>): string {
  const parametros = new URLSearchParams({ panel: PANEL_STOCK, [CLAVE_DE_ITEM_DE_STOCK]: fila.id })
  return `${RUTAS.repuestos}/${fila.proyectoId}?${parametros.toString()}`
}

/** Cómo se nombra el vehículo del proyecto de origen: el título si quien mira lo ve; si es externo, su etiqueta. */
export function vehiculoDelStock(
  fila: Pick<FilaDeStock, 'vehiculoId' | 'vehiculoTitulo' | 'vehiculoEtiqueta'>,
): string {
  if (fila.vehiculoId !== null) return fila.vehiculoTitulo ?? 'Vehículo que no puedes ver'
  return fila.vehiculoEtiqueta ? `Externo · ${fila.vehiculoEtiqueta}` : 'Externo'
}
