import { z } from 'zod'

// guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
const personaId = z.guid()

export const esquemaPersona = z.object({ personaId })

export const esquemaRolDePersona = z.object({
  personaId,
  rolId: z.guid(),
  // El primer rol de una persona queda como principal (es el que se muestra junto a su nombre).
  principal: z.boolean().optional(),
})

export const esquemaBloquear = z.object({
  personaId,
  bloquear: z.boolean(),
  motivo: z.string().trim().max(200).optional(),
})

export const esquemaInvitar = z.object({
  email: z.email({ error: 'Escribe un correo válido.' }).trim().toLowerCase(),
  nombre: z.string().trim().max(120, { error: 'El nombre es muy largo.' }),
  rolId: z.guid({ error: 'Elige el rol con el que entra.' }),
})
