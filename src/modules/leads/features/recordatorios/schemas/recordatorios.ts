import { z } from 'zod'
import { LARGO_MAXIMO_DEL_RECORDATORIO } from '../../../entities/recordatorios'

// Lo que cruza el límite de los recordatorios: sólo la forma. Que sea a futuro y que el lead esté
// en la cartera lo dice la base, con el campo en el `hint`.
const titulo = z.string().trim().min(1).max(LARGO_MAXIMO_DEL_RECORDATORIO)
const instante = z.iso.datetime({ offset: true })
const version = z.string().min(1)

export const esquemaCrearRecordatorio = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  leadId: z.guid(),
  titulo,
  recordarEn: instante,
})

export const esquemaGuardarRecordatorio = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  cambios: z
    .object({ titulo: titulo.optional(), recordarEn: instante.optional() })
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' }),
})

export const esquemaCompletarRecordatorio = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  // Poner, no alternar: repetirlo no cambia nada.
  completado: z.boolean(),
})

export const esquemaVersionDeRecordatorio = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})
