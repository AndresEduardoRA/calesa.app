import { z } from 'zod'

export const esquemaDeUsuario = z.object({ usuario: z.guid() })
export const esquemaDeConversacion = z.object({ conversacion: z.guid() })
export const esquemaDeSilencio = z.object({ conversacion: z.guid(), silenciada: z.boolean() })
