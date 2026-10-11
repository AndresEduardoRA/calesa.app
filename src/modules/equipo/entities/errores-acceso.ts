// Traduce lo que responde Supabase Auth a un error que se le puede mostrar a una persona.
// Regla de la pantalla de ingreso: correo inexistente y contraseña equivocada dicen lo mismo.
import {
  MENSAJE_INESPERADO,
  MENSAJE_SESION_VENCIDA,
  type CodigoError,
  type ErrorApp,
} from '@/shared/lib/errores'

// Lo mínimo de un AuthError de supabase-js.
export type ErrorDeAuth = { code?: string | null; message: string }

export const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.'
export const MENSAJE_REGISTRO_CERRADO =
  'El registro de cuentas nuevas está cerrado. Pide una invitación a quien administra el equipo.'
export const MENSAJE_ENLACE_VENCIDO = 'El enlace venció o ya se usó. Pide uno nuevo.'

const POR_CODIGO: Record<string, { codigo: CodigoError; mensaje: string }> = {
  invalid_credentials: { codigo: 'validacion', mensaje: MENSAJE_CREDENCIALES },
  email_not_confirmed: {
    codigo: 'regla',
    mensaje: 'Falta confirmar tu correo. Abre el enlace del mensaje que te enviamos.',
  },
  user_banned: { codigo: 'sin_permiso', mensaje: 'Tu cuenta está bloqueada.' },
  signup_disabled: { codigo: 'regla', mensaje: MENSAJE_REGISTRO_CERRADO },
  email_provider_disabled: { codigo: 'regla', mensaje: MENSAJE_REGISTRO_CERRADO },
  user_already_exists: { codigo: 'duplicado', mensaje: 'Ya existe una cuenta con ese correo.' },
  email_exists: { codigo: 'duplicado', mensaje: 'Ya existe una cuenta con ese correo.' },
  weak_password: {
    codigo: 'validacion',
    mensaje: 'La contraseña es muy débil. Usa al menos 8 caracteres.',
  },
  same_password: {
    codigo: 'validacion',
    mensaje: 'La contraseña nueva tiene que ser distinta de la anterior.',
  },
  over_email_send_rate_limit: {
    codigo: 'regla',
    mensaje: 'Ya se enviaron varios correos seguidos. Espera unos minutos y prueba de nuevo.',
  },
  over_request_rate_limit: {
    codigo: 'regla',
    mensaje: 'Demasiados intentos. Espera unos minutos y prueba de nuevo.',
  },
  otp_expired: { codigo: 'regla', mensaje: MENSAJE_ENLACE_VENCIDO },
  flow_state_expired: { codigo: 'regla', mensaje: MENSAJE_ENLACE_VENCIDO },
  flow_state_not_found: { codigo: 'regla', mensaje: MENSAJE_ENLACE_VENCIDO },
  bad_code_verifier: { codigo: 'regla', mensaje: MENSAJE_ENLACE_VENCIDO },
  session_not_found: { codigo: 'no_autenticado', mensaje: MENSAJE_SESION_VENCIDA },
  session_expired: { codigo: 'no_autenticado', mensaje: MENSAJE_SESION_VENCIDA },
}

// Cuando el trigger `auth_registro_permitido()` rechaza el alta, Auth no reenvía su mensaje:
// responde un 500 genérico con este texto. Es la única señal de que el registro está cerrado.
const RECHAZO_DE_LA_BASE = /database error saving new user/i

export function esRechazoDeRegistro(mensaje: string | null | undefined): boolean {
  return RECHAZO_DE_LA_BASE.test(mensaje ?? '')
}

export function errorDeAuth(error: ErrorDeAuth): ErrorApp {
  if (esRechazoDeRegistro(error.message)) {
    return { codigo: 'regla', mensaje: MENSAJE_REGISTRO_CERRADO }
  }
  const conocido = error.code ? POR_CODIGO[error.code] : undefined
  // El texto crudo de Auth está en inglés y a veces delata si el correo existe: no se muestra.
  return conocido ?? { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO }
}
