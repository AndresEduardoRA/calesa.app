import 'server-only'
import { errorDePostgrest, type ErrorPostgrest } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'

// Traducir lo que la base rechaza al registrar un documento (6.06-2). El mensaje ya viene escrito para la persona; el `hint` de una validación nombra el campo y aquí se traduce al del
// formulario. Lo que el formulario no tiene (la ruta, el formato, el peso, la unidad) se dice arriba, sin campo.
export const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'
const SIN_PERMISO_PARA_SUBIR = 'No puedes subir documentos a esta unidad.'

const CAMPO_DEL_FORMULARIO: Record<string, string> = {
  vence_el: 'venceEl',
  tipo: 'tipoId',
  nota: 'nota',
}

type ErrorConPista = ErrorPostgrest & { hint?: string | null }

export function falloDeLaBase(error: ErrorConPista): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  if (app.codigo === 'sin_permiso') {
    return { ok: false, error: { ...app, mensaje: SIN_PERMISO_PARA_SUBIR } }
  }
  const campo = error.hint ? CAMPO_DEL_FORMULARIO[error.hint] : undefined
  return campo && app.codigo === 'regla'
    ? { ok: false, error: app, porCampo: { [campo]: app.mensaje } }
    : { ok: false, error: app }
}

// Las RPC de documentos no declaran valores por omisión y sus tipos generados no admiten nulo; la base sí (un parámetro nulo es «no va»).
export function nuloParaLaBase(valor: string | null): string {
  return valor as string
}

export const inesperado = (): ResultadoDeAccion<never> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: NO_SE_LEYO },
})
