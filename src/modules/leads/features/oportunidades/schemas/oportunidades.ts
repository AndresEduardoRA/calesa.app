import { z } from 'zod'
import {
  LARGO_MAXIMO_DE_MOTIVO,
  LARGO_MAXIMO_DE_NOTAS,
  LARGO_MAXIMO_DE_TITULO,
  MONTO_MAXIMO,
} from '../../../entities/oportunidad'

// Lo que cruza el límite de las oportunidades: la forma. Quién puede y lo que no se ve lo dice la base.
const version = z.string().min(1)
const titulo = z.string().trim().min(1).max(LARGO_MAXIMO_DE_TITULO)
const monto = z.number().nonnegative().lt(MONTO_MAXIMO).nullable()
const notas = z.string().max(LARGO_MAXIMO_DE_NOTAS).nullable()
const vehiculo = z.guid().nullable()

export const esquemaCrearOportunidad = z.object({
  // El del intento: lo genera el navegador al abrir el panel y lo conserva en cada reintento.
  id: z.guid(),
  leadId: z.guid(),
  datos: z.object({
    titulo,
    monto_estimado: monto,
    notas,
    vehiculo_id: vehiculo,
  }),
})

export const esquemaGuardarOportunidad = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  cambios: z
    .object({
      titulo: titulo.optional(),
      monto_estimado: monto.optional(),
      notas: notas.optional(),
      vehiculo_id: vehiculo.optional(),
    })
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' }),
})

export const esquemaMoverOportunidad = z.object({
  id: z.guid(),
  etapaEsperada: z.guid(),
  etapa: z.guid(),
  motivoPerdida: z.string().trim().max(LARGO_MAXIMO_DE_MOTIVO).nullable(),
})

export const esquemaVersionDeOportunidad = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})
