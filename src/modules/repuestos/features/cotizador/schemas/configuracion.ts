import { z } from 'zod'
import {
  decimalCanonico,
  validarCaja,
  validarFormula,
  validarTramo,
} from '../../../entities/cotizador/configuracion'

// Lo que cruza al servidor al publicar la fórmula y al guardar un tramo o una caja del cotizador (8.12-2, C3, C5–C7). Los decimales viajan como
// **texto canónico** (`'1.3500'`, nunca `z.number()`): el formulario los lee con el locale y la action los vuelve a validar con `decimalCanonico`.
// La base vuelve a revisarlo (los `check`, el trigger de solape, el único `(moneda, monto)`).
type Validado<D> =
  { ok: true; datos: D } | { ok: false; errores: Record<string, string | undefined> }

function aplicar<D>(resultado: Validado<D>, ctx: z.RefinementCtx): D {
  if (!resultado.ok) {
    for (const [campo, mensaje] of Object.entries(resultado.errores)) {
      if (mensaje) ctx.addIssue({ code: 'custom', message: mensaje, path: [campo] })
    }
    return z.NEVER
  }
  return resultado.datos
}

const texto = z.string().max(40)
const moneda = z.string().regex(/^[A-Z]{3}$/)

export const esquemaPublicarConfiguracion = z
  .strictObject({
    factor: texto,
    recargo: texto,
    redondeo: texto,
    vigenteEsperada: z.number().int().positive().nullable(),
  })
  .transform((v, ctx) => ({
    ...aplicar(validarFormula(v, decimalCanonico), ctx),
    vigenteEsperada: v.vigenteEsperada,
  }))

export const esquemaGuardarTramo = z
  .strictObject({
    id: z.guid().nullable(),
    moneda,
    costoMin: texto,
    costoMax: texto,
    monto: texto,
    activo: z.boolean(),
  })
  .transform((v, ctx) => ({
    ...aplicar(validarTramo(v, decimalCanonico), ctx),
    id: v.id,
    moneda: v.moneda,
    activo: v.activo,
  }))

export const esquemaGuardarCaja = z
  .strictObject({ id: z.guid().nullable(), moneda, monto: texto, activa: z.boolean() })
  .transform((v, ctx) => ({
    ...aplicar(validarCaja(v, decimalCanonico), ctx),
    id: v.id,
    moneda: v.moneda,
    activa: v.activa,
  }))

export type EntradaDePublicar = z.input<typeof esquemaPublicarConfiguracion>
export type EntradaDeTramo = z.input<typeof esquemaGuardarTramo>
export type EntradaDeCaja = z.input<typeof esquemaGuardarCaja>
