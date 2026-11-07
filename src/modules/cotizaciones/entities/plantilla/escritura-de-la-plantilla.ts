// Lo que escribe el editor de la plantilla de la tarjeta (4.19-3a): guardar el borrador, publicarlo con una nota y descartarlo, por las RPC del 4.19-1. La regla de verdad
// (el permiso, la versión esperada, la nota, la validación) es de la base; esto es la forma de los pedidos, la nota que se frena antes y cómo un rechazo de la base llega
// a un campo.
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'
import { caracteres } from './json-de-la-base'
import { REGLAS_DE_PLANTILLA } from './motivos-de-plantilla'
import { revisarTextoParaLaBase } from './texto-de-la-base'

// `esperada` es el `actualizado_en` del borrador que se leyó, tal cual lo dio la base (con sus microsegundos): nula sólo para crear el primero. Publicar y descartar la
// piden siempre (con una nula la base no compara y no daría PT409).
export type PedidoDeGuardarLaPlantilla = {
  origenId: string
  esperada: string | null
  definicion: unknown
}
export type PedidoDePublicarLaPlantilla = { origenId: string; esperada: string; nota: string }
export type PedidoDeDescartarLaPlantilla = { origenId: string; esperada: string }

// Guardar da la nueva versión del borrador (el `actualizado_en` que dejó la base); publicar, el id de la plantilla publicada; descartar, nada.
export interface RepositorioDeLaPlantilla {
  guardar(pedido: PedidoDeGuardarLaPlantilla): Promise<ResultadoDeAccion<string>>
  publicar(pedido: PedidoDePublicarLaPlantilla): Promise<ResultadoDeAccion<string>>
  descartar(pedido: PedidoDeDescartarLaPlantilla): Promise<ResultadoDeAccion<null>>
}

export const MOTIVO_SIN_PERMISO_DE_PLANTILLA =
  'No tienes permiso para configurar la plantilla de este origen.'

export const MENSAJE_DE_NOTA_DE_PLANTILLA_VACIA = 'Publicar pide una nota.'
// La base no limita la nota; el tope es el de la nota de la fórmula (`entities/formula/publicacion.ts`, del carril B y de otra área: se repite aquí). Se cuentan
// caracteres y no unidades UTF-16 (4-74): un emoji es uno.
export const LARGO_MAXIMO_DE_NOTA_DE_PLANTILLA = 2000

export const esquemaDeNotaDePlantilla = z
  .string()
  .trim()
  .min(1, { error: MENSAJE_DE_NOTA_DE_PLANTILLA_VACIA })
  .refine((nota) => caracteres(nota) <= LARGO_MAXIMO_DE_NOTA_DE_PLANTILLA, {
    error: 'La nota pasa de 2.000 caracteres.',
  })
  .refine((nota) => revisarTextoParaLaBase(nota) === null, {
    error: 'La nota tiene un carácter que no se puede guardar.',
  })

// Lo que trae un error de PostgREST de una RPC de la plantilla.
export type ErrorDeLaPlantilla = {
  code?: string | null
  message: string
  details?: string | null
  hint?: string | null
}

const esReglaDePlantilla = (regla: string | null | undefined) =>
  REGLAS_DE_PLANTILLA.some((r) => r === regla)

// El rechazo de una RPC como lo devuelve una action. Un 22023 de `validar_plantilla()` (la regla en `details`, el `donde` en `hint`) va al campo `donde` (a la raíz,
// `definicion`, si no trae uno), con el mensaje de la base tal cual: `errorDePostgrest()` lo cambiaría por el genérico si un id dentro dice «column» o «relation». El 22023
// de «Publicar pide una nota.» (`hint = 'nota'`) va al campo `nota`. El PT409 es un conflicto con el mensaje de la base (no dice quién: P1). Lo demás, sin campo.
export function rechazoHaciaUnCampo(error: ErrorDeLaPlantilla): ResultadoDeAccion<never> {
  const generico = errorDePostgrest(error)
  if (error.code === '22023' && esReglaDePlantilla(error.details)) {
    const mensaje = error.message.trim() === '' ? generico.mensaje : error.message
    const hint = error.hint?.trim() ?? ''
    return {
      ok: false,
      error: { codigo: 'regla', mensaje },
      porCampo: { [hint === '' ? 'definicion' : hint]: mensaje },
    }
  }
  if (error.code === '22023' && error.hint === 'nota') {
    return { ok: false, error: generico, porCampo: { nota: generico.mensaje } }
  }
  return { ok: false, error: generico }
}
