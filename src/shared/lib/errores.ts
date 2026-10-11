// Los errores cruzan las capas como valores, no como excepciones: `{ ok: false, error }`.

export type CodigoError =
  | 'no_autenticado'
  | 'sin_permiso'
  | 'no_encontrado'
  | 'conflicto' // otro cambió lo mismo: la UI ofrece «Recargar»
  | 'duplicado'
  | 'regla' // una regla del negocio lo impide; el mensaje dice cuál
  | 'validacion'
  | 'inesperado'

export type ErrorApp = { codigo: CodigoError; mensaje: string }

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: ErrorApp }

export const MENSAJE_INESPERADO = 'Algo falló de nuestro lado. Volvé a intentar en un momento.'

export function ok<T>(data: T): Resultado<T> {
  return { ok: true, data }
}

export function fallo(codigo: CodigoError, mensaje: string): Resultado<never> {
  return { ok: false, error: { codigo, mensaje } }
}

export const MENSAJE_CONFLICTO = 'Otra persona cambió esto mientras lo editabas.'

// Un `PT409` nunca es un error genérico: la pantalla lo muestra con «Recargar». El mensaje de la
// RPC suele decir quién lo cambió y cuándo; si no vino, queda el genérico.
export function conflicto(mensaje: string = MENSAJE_CONFLICTO): Resultado<never> {
  return fallo('conflicto', mensaje)
}

// Lo mínimo que traen los errores de PostgREST y de las RPC.
export type ErrorPostgrest = { code?: string | null; message: string }

// Las RPC levantan errores con el mensaje ya escrito para la persona; una violación de constraint
// sin RPC de por medio trae el texto técnico de Postgres, que no se muestra.
const MENSAJE_TECNICO = /violates|constraint|relation|column|syntax/i

const POR_CODIGO: Record<string, { codigo: CodigoError; generico: string }> = {
  PT409: { codigo: 'conflicto', generico: MENSAJE_CONFLICTO },
  '42501': { codigo: 'sin_permiso', generico: 'No tenés permiso para hacer esto.' },
  '23505': { codigo: 'duplicado', generico: 'Ya existe un registro con esos datos.' },
  '23503': { codigo: 'regla', generico: 'No se puede: hay otros datos que dependen de este.' },
  '23514': { codigo: 'regla', generico: 'El dato no cumple una regla del sistema.' },
  P0001: { codigo: 'regla', generico: 'No se puede completar la operación.' },
  PGRST116: { codigo: 'no_encontrado', generico: 'No se encontró lo que buscabas.' },
  PGRST301: { codigo: 'no_autenticado', generico: 'Tu sesión venció. Volvé a ingresar.' },
}

export function errorDePostgrest(error: ErrorPostgrest): ErrorApp {
  const conocido = error.code ? POR_CODIGO[error.code] : undefined
  if (!conocido) {
    return { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO }
  }
  const legible = error.message.trim() !== '' && !MENSAJE_TECNICO.test(error.message)
  return { codigo: conocido.codigo, mensaje: legible ? error.message : conocido.generico }
}
