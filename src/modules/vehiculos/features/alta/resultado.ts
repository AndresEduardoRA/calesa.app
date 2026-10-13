import type { ErrorApp } from '@/shared/lib/errores'

// Lo que devuelve guardar un vehículo. Además del error, qué campos no pasaron (por su clave en el
// formulario): el motivo se escribe al lado de cada uno. Lo arma la validación del servidor (el
// mismo esquema que usa el formulario) o, en última instancia, la base.
export type ResultadoDeGuardar<Dato> =
  { ok: true; data: Dato } | { ok: false; error: ErrorApp; porCampo?: Record<string, string> }

export const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

export function noValido(porCampo: Record<string, string>): ResultadoDeGuardar<never> {
  return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION }, porCampo }
}
