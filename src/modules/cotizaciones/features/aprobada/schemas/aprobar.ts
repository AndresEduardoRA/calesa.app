import { z } from 'zod'

// Aprobar una cotización: su id y la versión que se tenía en pantalla (el texto de la base, con sus microsegundos: se valida su forma y nunca pasa por `Date`).
export const esquemaAprobar = z.object({
  id: z.guid(),
  actualizadoEn: z.iso.datetime({ offset: true }),
})
