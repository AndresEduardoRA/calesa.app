import 'server-only'

import { entornoDelServidor, type EntornoDelServidor } from '../../config/servidor'
import { fallo, type Resultado } from '../errores'
import { adaptadorDe, remitenteDe } from './proveedor'
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
  const adaptador = adaptadorDe(entorno, dependencias.pedir)
  if (!adaptador) {
    return fallo(
      'regla',
      `Falta la configuración de ${entorno.EMAIL_PROVEEDOR} (docs/ENTORNOS.md › Correo).`,
    )
  }
  return adaptador(valido.data, remitenteDe(entorno))
}
