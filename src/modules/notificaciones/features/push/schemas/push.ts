import { z } from 'zod'

const BASE64URL = /^[A-Za-z0-9_-]{16,128}={0,2}$/

// Lo que entrega `PushSubscription.toJSON()`. El host del endpoint lo vuelve a validar la base (`_push_endpoint_valido`).
export const esquemaSuscribirPush = z.object({
  endpoint: z
    .url({ protocol: /^https$/, error: 'La dirección del navegador no es válida.' })
    .max(2048),
  claves: z.object({
    p256dh: z.string().regex(BASE64URL, { error: 'Las claves del navegador no son válidas.' }),
    auth: z.string().regex(BASE64URL, { error: 'Las claves del navegador no son válidas.' }),
  }),
  userAgent: z.string().max(512).nullable(),
})

export const esquemaQuitarSuscripcion = z.object({
  endpoint: z
    .url({ protocol: /^https$/, error: 'La dirección del navegador no es válida.' })
    .max(2048),
})
