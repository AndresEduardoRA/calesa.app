// Mensajes que una pantalla de acceso muestra cuando alguien llega redirigido (`?aviso=clave`).
// La URL sólo lleva la clave: el texto sale de acá, así nadie puede hacer que la pantalla de
// ingreso diga lo que quiera armando un enlace.
import type { TonoAviso } from '@/shared/ui/aviso'
import { MENSAJE_ENLACE_VENCIDO, MENSAJE_REGISTRO_CERRADO } from './errores-acceso'

export type Aviso = { tono: TonoAviso; mensaje: string }

export const AVISOS = {
  bloqueada: {
    tono: 'peligro',
    mensaje:
      'Tu cuenta está bloqueada y se cerró la sesión. Avisa a quien administra el equipo para volver a entrar.',
  },
  baja: {
    tono: 'peligro',
    mensaje: 'Tu cuenta ya no forma parte del equipo y se cerró la sesión.',
  },
  confirmar_correo: {
    tono: 'positivo',
    mensaje:
      'Cuenta creada. Te enviamos un correo para confirmarla: el enlace se puede abrir en este dispositivo o en otro.',
  },
  enlace_vencido: { tono: 'aviso', mensaje: MENSAJE_ENLACE_VENCIDO },
  confirmacion_vencida: {
    tono: 'aviso',
    mensaje:
      'El enlace de confirmación venció o ya se usó. Si la cuenta ya está confirmada, ingresa con tu correo y contraseña.',
  },
  invitacion_vencida: {
    tono: 'aviso',
    mensaje: 'La invitación venció o ya se usó. Pide una nueva a quien administra el equipo.',
  },
  google: {
    tono: 'peligro',
    mensaje: 'No se pudo ingresar con Google. Prueba de nuevo o usa tu correo y contraseña.',
  },
  google_cancelado: { tono: 'info', mensaje: 'Se canceló el ingreso con Google.' },
  registro_cerrado: {
    tono: 'aviso',
    mensaje: `No hay una cuenta con ese correo. ${MENSAJE_REGISTRO_CERRADO}`,
  },
} as const satisfies Record<string, Aviso>

export type ClaveAviso = keyof typeof AVISOS

export function avisoDe(clave: string | null | undefined): Aviso | null {
  return clave && Object.hasOwn(AVISOS, clave) ? AVISOS[clave as ClaveAviso] : null
}
