// La invitación: una cuenta que nace por la API de admin de Auth con un rol, y el enlace con el
// que esa persona elige su contraseña. Sólo hay un enlace vigente por persona: generar otro
// invalida el anterior, también el que salió por correo.
import { RUTAS } from '@/shared/lib/rutas'

// `invite` mientras la cuenta no confirmó su correo. Si ya abrió un enlace (quedó confirmada)
// pero no eligió contraseña, Auth sólo deja generar uno de recuperación: llega a la misma pantalla.
export type TipoDeEnlace = 'invite' | 'recovery'

// El enlace que se le pasa a la persona. Entra por `/auth/callback`, igual que el del correo.
export function enlaceDeInvitacion(origen: string, tokenHash: string, tipo: TipoDeEnlace): string {
  const consulta = new URLSearchParams({ token_hash: tokenHash, type: tipo })
  return `${origen.replace(/\/$/, '')}${RUTAS.canje}?${consulta.toString()}`
}

export type InvitacionHecha = {
  personaId: string
  // Si Auth pudo mandar el correo. Si no, `enlace` trae el que hay que pasarle a mano.
  correoEnviado: boolean
  enlace: string | null
}

export const MENSAJE_YA_ACEPTO =
  'Esa persona ya aceptó su invitación. Si olvidó su contraseña, la recupera desde la pantalla de ingreso.'
