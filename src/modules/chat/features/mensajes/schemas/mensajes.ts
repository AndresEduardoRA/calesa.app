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

export const esquemaDeEdicion = z.object({
  mensaje: z.guid(),
  // La versión que se leyó: `editadoEn ?? creadoEn`.
  esperado: z.iso.datetime({ offset: true }),
  cuerpo: z.string().min(1).max(LARGO_MAXIMO),
})

export const esquemaDeBorrado = z.object({ mensaje: z.guid() })
