// Lo que llega a la persona cuando la base rechaza crear un proyecto (8.09-1, C4). Puro: lo usa `infra/proyectos/crear.ts`. El `hint` de la base nombra el campo; aquí se
// traduce al del formulario para escribir el motivo junto a él.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'

export const SIN_PERMISO_PARA_CREAR_PROYECTOS =
  'No tienes permiso para crear proyectos de repuestos.'
export const SIN_PERMISO_PARA_CERRAR_PROYECTOS =
  'No tienes permiso para cerrar ni reabrir proyectos de repuestos.'
export const SIN_PERMISO_PARA_ELIMINAR_PROYECTOS =
  'No tienes permiso para eliminar ni restaurar proyectos de repuestos.'
export const NO_SE_LEYO_EL_PROYECTO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

const CAMPO_DEL_FORMULARIO: Record<string, string> = {
  vehiculo_id: 'vehiculoId',
  vehiculo_etiqueta: 'vehiculoEtiqueta',
  vin: 'vin',
  lead_id: 'leadId',
  cliente_nombre: 'clienteNombre',
  cliente_telefono: 'clienteTelefono',
  notas: 'notas',
}

export type ErrorAlCrear = { code?: string | null; message: string; hint?: string | null }

/** El error de la base, dicho para la persona y, si nombra un campo, junto a él. */
export function rechazoDeProyecto(error: ErrorAlCrear): ResultadoDeAccion<never> {
  const app = errorDePostgrest({ code: error.code ?? null, message: error.message })
  const campo = error.hint ? CAMPO_DEL_FORMULARIO[error.hint] : undefined
  if (campo && app.codigo !== 'inesperado') {
    return { ok: false, error: app, porCampo: { [campo]: app.mensaje } }
  }
  return { ok: false, error: app }
}
