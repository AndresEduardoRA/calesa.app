import { z } from 'zod'

// Aprobar una cotización: su id y la versión que se tenía en pantalla (el texto de la base, con sus microsegundos: nunca pasa por `Date`).
export const esquemaAprobar = z.object({ id: z.guid(), actualizadoEn: z.string().min(1) })
