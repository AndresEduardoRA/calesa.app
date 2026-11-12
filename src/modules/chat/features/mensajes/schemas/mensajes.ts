import { z } from 'zod'
import { LARGO_MAXIMO } from '../../../entities/mensajes'

export const esquemaDeEnvio = z.object({
  id: z.guid(),
  conversacion: z.guid(),
  cuerpo: z.string().min(1).max(LARGO_MAXIMO),
  respondeA: z.guid().optional(),
})

export const esquemaDeLectura = z.object({
  conversacion: z.guid(),
  hasta: z.iso.datetime({ offset: true }),
})
