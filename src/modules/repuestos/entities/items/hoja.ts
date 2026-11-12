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
