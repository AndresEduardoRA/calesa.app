import { z } from 'zod'
import { LARGO_MAXIMO } from '../../../entities/mensajes'
import { CLASES_DE_MENCION, MAXIMO_DE_MENCIONES } from '../../../entities/menciones'

export const esquemaDeEnvio = z.object({
  id: z.guid(),
  conversacion: z.guid(),
  cuerpo: z.string().min(1).max(LARGO_MAXIMO),
  respondeA: z.guid().optional(),
  // Los tokens del cuerpo, uno por referencia única: la base exige que sean el mismo conjunto (7.10-2).
  menciones: z
    .array(z.strictObject({ tipo: z.enum(CLASES_DE_MENCION), id: z.guid() }))
    .max(MAXIMO_DE_MENCIONES)
    .optional(),
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
