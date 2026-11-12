import { fallo, ok } from '../../errores'
import { destinatarios, type AdaptadorDeEmail } from '../tipos'
import { pedirJson, rechazoDe, remitenteEnTexto } from './comun'

// Resend por su API REST (`POST /emails`), sin su SDK (el lint lo prohíbe; por eso el archivo es `resend-rest.ts`, no `resend.ts`). Sólo manda: las plantillas, audiencias y broadcasts
// del panel de Resend no se usan. Docs: https://resend.com/docs/api-reference/emails/send-email
export const URL_DE_RESEND = 'https://api.resend.com/emails'

export function crearAdaptadorResend(clave: string, pedir: typeof fetch = fetch): AdaptadorDeEmail {
  return async (mensaje, remitente) => {
    // Resend sólo admite letras, números, `_` y `-` en el valor de una etiqueta.
    const tags = Object.entries(mensaje.etiquetas ?? {}).map(([name, value]) => ({
      name,
      value: value.replaceAll('.', '_'),
    }))
    const enviado = await pedirJson({
      pedir,
      proveedor: 'Resend',
      url: URL_DE_RESEND,
      cabeceras: { Authorization: `Bearer ${clave}` },
      cuerpo: {
        from: remitenteEnTexto(remitente),
        to: destinatarios(mensaje.para),
        subject: mensaje.asunto,
        html: mensaje.html,
        text: mensaje.texto,
        ...(tags.length > 0 ? { tags } : {}),
      },
    })
    if (!enviado.ok) return enviado
    const { respuesta, json } = enviado.data
    const cuerpo = (json ?? {}) as { id?: unknown; name?: unknown }
    if (!respuesta.ok)
      return rechazoDe('Resend', 'RESEND_API_KEY', respuesta.status, cuerpo.name as string)
    return typeof cuerpo.id === 'string'
      ? ok({ id: cuerpo.id })
      : fallo('inesperado', 'Resend no devolvió el id del correo.')
  }
}
