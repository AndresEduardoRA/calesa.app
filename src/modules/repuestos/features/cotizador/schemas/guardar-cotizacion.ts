import { z } from 'zod'
import { TOPE_DE_LINEAS } from '../../../entities/cotizador/formula'
import {
  CANTIDAD_MAXIMA,
  LARGO_DE_LA_DESCRIPCION,
  LARGO_DE_LAS_NOTAS,
} from '../../../entities/cotizador/hoja-editable'

// Lo que cruza al servidor al guardar, aceptar y anular una cotización de repuestos (8.12-4, C7). Los montos van como texto exacto y no negativo
// (nunca `number`): la hoja los armó con `montoDeCelda`. Ni `total` ni sugerencias: `z.strictObject` los rechaza y la base también (22023).
const monto = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .nullable()

const esquemaDeLinea = z.strictObject({
  id: z.guid(),
  itemId: z.guid().nullable(),
  // Vacía la rechaza la base en su celda («Línea N: falta la descripción.»).
  descripcion: z.string().max(LARGO_DE_LA_DESCRIPCION),
  bloque: z.enum(['importado', 'local']),
  cantidad: z.number().int().min(1).max(CANTIDAD_MAXIMA),
  costo: monto,
  logistica: monto,
  caja: monto,
})

const version = {
  id: z.guid(),
  proyectoId: z.guid(),
  actualizadoEn: z.iso.datetime({ offset: true }),
}

export const esquemaGuardarCotizacion = z.strictObject({
  ...version,
  notas: z.string().max(LARGO_DE_LAS_NOTAS).nullable(),
  lineas: z.array(esquemaDeLinea).max(TOPE_DE_LINEAS),
})

export const esquemaCerrarCotizacion = z.strictObject(version)

export type EntradaGuardarCotizacion = z.infer<typeof esquemaGuardarCotizacion>
export type EntradaCerrarCotizacion = z.infer<typeof esquemaCerrarCotizacion>
