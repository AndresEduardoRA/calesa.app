import type { Envio } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'

// Lo que el formulario del transporte hace con la respuesta de una Server Action (6.06-3, copia de `features/documentos`: un área no importa otra): salió bien, otra persona cambió la fila (`PT409`: se avisa dentro de la fila y no se pierde lo escrito) o
// falló (con el motivo de la base, y por campo si lo trae). Lo que no llegó al servidor dice que no hay conexión.
export type ResultadoDelEnvio =
  | { tipo: 'ok' }
  | { tipo: 'conflicto'; mensaje: string }
  | { tipo: 'error'; mensaje: string; porCampo?: Record<string, string> }

export function resultadoDelEnvio<D>(envio: Envio<D>): ResultadoDelEnvio {
  if (envio.ok) return { tipo: 'ok' }
  if ('sinRed' in envio) return { tipo: 'error', mensaje: MENSAJE_SIN_CONEXION }
  if (envio.error.codigo === 'conflicto') return { tipo: 'conflicto', mensaje: envio.error.mensaje }
  return { tipo: 'error', mensaje: envio.error.mensaje, porCampo: envio.porCampo }
}
