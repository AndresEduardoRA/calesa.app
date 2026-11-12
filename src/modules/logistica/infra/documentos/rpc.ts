import 'server-only'
import { errorDePostgrest, type ErrorPostgrest } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'

// Traducir lo que la base rechaza al registrar, revisar, editar o eliminar un documento (6.06-2 y 6.06-3). El mensaje ya viene escrito para la persona; el `hint` de una validación nombra el campo y aquí se traduce al del
// formulario. Lo que el formulario no tiene (la ruta, el formato, el peso, la unidad) se dice arriba, sin campo.
export const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'
const SIN_PERMISO_PARA_SUBIR = 'No puedes subir documentos a esta unidad.'

const CAMPO_DEL_FORMULARIO: Record<string, string> = {
  vence_el: 'venceEl',
  emitido_el: 'emitidoEl',
  tipo: 'tipoId',
  nota: 'nota',
  motivo: 'motivo',
  visible_portal: 'visiblePortal',
}

const SIN_PERMISO_PARA_EDITAR_EL_PORTAL =
  'Sólo quien aprueba documentos decide si se ve en el portal.'

type ErrorConPista = ErrorPostgrest & { hint?: string | null }

// `sinPermiso` es lo que se dice si la base dice `42501`: por omisión, lo de subir; revisar, editar y eliminar traen el suyo.
export function falloDeLaBase(
  error: ErrorConPista,
  sinPermiso: string = SIN_PERMISO_PARA_SUBIR,
): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  if (app.codigo === 'sin_permiso') {
    const mensaje = error.hint === 'visible_portal' ? SIN_PERMISO_PARA_EDITAR_EL_PORTAL : sinPermiso
    return { ok: false, error: { ...app, mensaje } }
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
