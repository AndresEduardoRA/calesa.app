import { cortarAlTope } from '@/shared/lib/conteo'
import { TOPE_DE_ITEMS_DE_LA_HOJA, pendientesDe, type FilaDeItem } from '../nucleo/item'

// La hoja de ítems de un proyecto (8.09-2): lo que lee la pantalla y lo que dice cuando se llena. Puro.

/** Lo que dibuja la hoja: hasta 200 ítems y si había más (se leen 201). */
export type HojaLeida = { filas: FilaDeItem[]; hayMas: boolean }

export function armarHoja(leidas: readonly FilaDeItem[]): HojaLeida {
  return cortarAlTope(leidas, TOPE_DE_ITEMS_DE_LA_HOJA)
}

/** Con 200 ítems no cabe otro (D54): la hoja no dibuja la fila nueva. */
export function hojaLlena(filas: readonly FilaDeItem[], hayMas: boolean): boolean {
  return hayMas || filas.length >= TOPE_DE_ITEMS_DE_LA_HOJA
}

/** Las cuentas del estado derivado, sobre lo leído (D51). */
export function cuentasDeLaHoja(filas: readonly FilaDeItem[]): {
  items: number
  pendientes: number
} {
  return { items: filas.length, pendientes: pendientesDe(filas) }
}

export const TEXTO_DEL_TOPE_DE_LA_HOJA =
  'Este proyecto llegó a 200 ítems y la hoja no muestra más. Cierra este proyecto y abre otro para el resto.'
export const AVISO_DE_PROYECTO_CERRADO = 'El proyecto está cerrado: reábrelo para editar los ítems.'
export const MOTIVO_SIN_PERMISO_PARA_EDITAR = 'Sin permiso para editar.'
export const MOTIVO_PROYECTO_CERRADO = 'Proyecto cerrado.'
export const TEXTO_DE_HOJA_VACIA = 'Este proyecto todavía no tiene ítems.'

// Los catálogos que la hoja ofrece en sus celdas: cuatro listas de valores (la página pasa `leerCatalogosDeRepuestos()` tal cual: tiene de más). `areas/items` no importa
// `areas/catalogos`, así que lo que necesita lo declara acá y el tipo de aquel lo cumple por estructura.
export type ValorDeLaHoja = { id: string; nombre: string; activo: boolean }
export const CATALOGOS_DE_LA_HOJA = [
  'tipo_pieza',
  'condicion',
  'pais_origen',
  'modo_transporte',
] as const
export type ClaveDeCatalogoDeLaHoja = (typeof CATALOGOS_DE_LA_HOJA)[number]
export type CatalogosDeLaHoja = Record<
  ClaveDeCatalogoDeLaHoja,
  { valores: readonly ValorDeLaHoja[] }
>

/** Una moneda que se ofrece en la hoja (las activas de la empresa, en su orden). */
export type MonedaDeLaHoja = { codigo: string; simbolo: string; decimales: number }

/** El nombre de un valor de catálogo por su id (también si ya se desactivó: lo guardado no se pierde); nulo si no hay id o ya no está. */
export function nombreDelValor(
  catalogos: CatalogosDeLaHoja,
  catalogo: ClaveDeCatalogoDeLaHoja,
  id: string | null,
): string | null {
  if (id === null) {
    return null
  }
  return catalogos[catalogo].valores.find((v) => v.id === id)?.nombre ?? null
}
