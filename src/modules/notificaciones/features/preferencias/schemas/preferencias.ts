import { z } from 'zod'

// Un tipo de aviso: el de una fase nueva entra sin tocar este esquema (la interfaz ofrece el catálogo).
export const esquemaGuardarPreferenciaDePush = z.object({
  tipo: z.string().regex(/^[a-z][a-z0-9_]{0,59}$/, { error: 'Ese tipo de aviso no es válido.' }),
  encendido: z.boolean(),
})
