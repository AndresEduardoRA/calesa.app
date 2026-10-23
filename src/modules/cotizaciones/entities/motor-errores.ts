// Los errores de llamada del motor: lo que no es un dato que falta sino un error del código que llama (un modo
// que no corresponde a la fórmula, una entrada con claves de otro tipo o una variante que no está, una fórmula que no
// pasó por validarFormula). Lanzan: lo que puede causar una persona viaja como valor, en `faltantes` y en
// `overrides_descartados` (docs/DECISIONES.md, 2026-10-23, paso 4.05 prompts 2 y 3).

export const CODIGOS_DE_ERROR_DEL_MOTOR = [
  'modo_invalido',
  'entrada_invalida',
  'formula_sin_validar',
] as const

export type CodigoDeErrorDelMotor = (typeof CODIGOS_DE_ERROR_DEL_MOTOR)[number]

export class ErrorDelMotor extends Error {
  readonly codigo: CodigoDeErrorDelMotor
  readonly donde: string | undefined

  constructor(codigo: CodigoDeErrorDelMotor, mensaje: string, donde?: string) {
    super(mensaje)
    this.name = 'ErrorDelMotor'
    this.codigo = codigo
    this.donde = donde
  }
}
