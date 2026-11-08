import { z } from 'zod'
import { numeroDeComprobante } from './comprobante'

// La serie de los comprobantes (4.26-3): de 1 a 12 letras A–Z, números o guiones, guardada en mayúsculas y sin espacios (P6 a del 4.26). La base la vuelve a
// normalizar y a validar (`comprobantes_serie_cambiar`, 22023 con `hint` `serie`); esto evita un viaje y dice el motivo junto al campo.
export const SERIE_MAXIMA = 12

// El texto de la base.
export const MENSAJE_DE_LA_SERIE = 'La serie lleva de 1 a 12 letras, números o guiones.'

export const esquemaDeSerie = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{1,12}$/, { error: MENSAJE_DE_LA_SERIE })

// La serie vigente como la lee Configuración › Empresa: el último número emitido de esa serie (0 si ninguno) y la versión de la fila (el texto de la base).
export type SerieVigente = { serie: string; ultimo: number; actualizadoEn: string }

// «A-13»: el número que llevará el próximo comprobante de la serie.
export function proximoComprobante(serie: string, ultimo: number): string {
  return numeroDeComprobante(serie, ultimo + 1)
}
