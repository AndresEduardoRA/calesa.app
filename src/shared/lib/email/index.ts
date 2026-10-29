import 'server-only'

import { entornoDelServidor, type EntornoDelServidor } from '../../config/servidor'
import { fallo, type Resultado } from '../errores'
import { crearAdaptadorMailpit } from './adaptadores/mailpit'
import { esquemaDeMensaje, type EnvioDeEmail, type MensajeDeEmail } from './tipos'

export type { EnvioDeEmail, MensajeDeEmail } from './tipos'

type Dependencias = { entorno?: EntornoDelServidor; pedir?: typeof fetch }

// La única puerta de los correos que manda la app (notificaciones, compartir una cotización, alertas). El proveedor sale de
// `EMAIL_PROVEEDOR`: cambiarlo es cambiar variables, nunca código (docs/ENTORNOS.md). Los correos de Auth (invitación, recuperación)
// no pasan por aquí: los manda Supabase Auth por SMTP.
export async function enviarEmail(
  mensaje: MensajeDeEmail,
  dependencias: Dependencias = {},
): Promise<Resultado<EnvioDeEmail>> {
  const entorno = dependencias.entorno ?? entornoDelServidor()
  const valido = esquemaDeMensaje.safeParse(mensaje)
  if (!valido.success) return fallo('validacion', 'El correo no se mandó: el mensaje no es válido.')
  if (entorno.EMAIL_PROVEEDOR === 'ninguno') {
    return fallo('regla', 'El envío de correos está apagado (EMAIL_PROVEEDOR=ninguno).')
  }
  // El esquema del entorno ya exige el remitente cuando hay un proveedor.
  const remitente = {
    email: entorno.EMAIL_REMITENTE ?? '',
    nombre: entorno.EMAIL_REMITENTE_NOMBRE ?? '',
  }
  if (entorno.EMAIL_PROVEEDOR === 'mailpit' && entorno.MAILPIT_URL) {
    return crearAdaptadorMailpit(entorno.MAILPIT_URL, dependencias.pedir)(valido.data, remitente)
  }
  return fallo(
    'regla',
    `${entorno.EMAIL_PROVEEDOR} todavía no tiene adaptador (Fase 7, docs/PLAN.md).`,
  )
}
