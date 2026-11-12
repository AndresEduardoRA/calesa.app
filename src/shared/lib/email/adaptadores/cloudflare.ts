import { fallo, ok } from '../../errores'
import { destinatarios, type AdaptadorDeEmail } from '../tipos'
import { pedirJson, rechazoDe } from './comun'

// Cloudflare Email Service por su API REST (`POST /accounts/{cuenta}/email/sending/send`). Verificado el 2026-11-11 con
// https://developers.cloudflare.com/email-service/api/send-emails/rest-api/ : `from` es `{ address, name }`, `to` un arreglo (hasta 50)
// y la respuesta trae `result: { delivered, permanent_bounces, queued }`, sin id de mensaje (sólo el binding de Workers lo devuelve).
// Cloudflare no tiene etiquetas: las del mensaje se ignoran.
export const urlDeCloudflare = (cuenta: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cuenta)}/email/sending/send`

// El contrato exige un id; Cloudflare no da uno por REST, y que la API aceptara el envío es lo que importa.
export const ID_SIN_PROVEEDOR = 'sin-id'

type Cuerpo = {
  success?: unknown
  errors?: { code?: unknown }[] | null
  result?: { delivered?: unknown; permanent_bounces?: unknown; queued?: unknown } | null
}

const cantidad = (lista: unknown) => (Array.isArray(lista) ? lista.length : 0)

export function crearAdaptadorCloudflare(
  cuenta: string,
  token: string,
  pedir: typeof fetch = fetch,
): AdaptadorDeEmail {
  return async (mensaje, remitente) => {
    const enviado = await pedirJson({
      pedir,
      proveedor: 'Cloudflare',
      url: urlDeCloudflare(cuenta),
      cabeceras: { Authorization: `Bearer ${token}` },
      cuerpo: {
        from: remitente.nombre
          ? { address: remitente.email, name: remitente.nombre }
          : { address: remitente.email },
        to: destinatarios(mensaje.para),
        subject: mensaje.asunto,
        html: mensaje.html,
        text: mensaje.texto,
      },
    })
    if (!enviado.ok) return enviado
    const { respuesta, json } = enviado.data
    const cuerpo = (json ?? {}) as Cuerpo
    const codigo = cuerpo.errors?.find((e) => typeof e.code === 'number')?.code as
      number | undefined
    if (!respuesta.ok)
      return rechazoDe(
        'Cloudflare',
        'CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID',
        respuesta.status,
        codigo,
      )
    if (cuerpo.success !== true)
      return fallo(
        'inesperado',
        `El correo no salió: Cloudflare no aceptó el pedido${codigo === undefined ? '' : ` (${String(codigo)})`}.`,
      )
    const { delivered, queued, permanent_bounces: rebotados } = cuerpo.result ?? {}
    // Con varios destinatarios, uno rebotado no tumba el envío de los demás; sólo si ninguno salió es un fallo.
    if (cantidad(rebotados) > 0 && cantidad(delivered) + cantidad(queued) === 0)
      return fallo('inesperado', 'El correo no salió: Cloudflare rechazó al destinatario.')
    return ok({ id: ID_SIN_PROVEEDOR })
  }
}
