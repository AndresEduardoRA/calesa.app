import { z } from 'zod'
import { LARGO_MAXIMO_DE_TITULO, TOPE_DE_DESTINATARIOS } from '@/modules/agenda/client'

const titulo = z.string().trim().min(1).max(LARGO_MAXIMO_DE_TITULO)
const instante = z.iso.datetime({ offset: true })

// `id` es el del formulario al abrirse y se conserva en cada reintento (la base responde `repetido`).
export const esquemaDeTareaDelChat = z.object({
  id: z.guid(),
  conversacion: z.guid(),
  datos: z.strictObject({
    titulo,
    vence_en: instante.optional(),
    responsable_id: z.guid().optional(),
  }),
})

export const esquemaDeEventoDelChat = z.object({
  id: z.guid(),
  conversacion: z.guid(),
  datos: z.strictObject({
    titulo,
    inicia_en: instante,
    visibilidad: z.enum(['privado', 'seleccionados']),
  }),
  destinatarios: z.array(z.guid()).max(TOPE_DE_DESTINATARIOS),
})
