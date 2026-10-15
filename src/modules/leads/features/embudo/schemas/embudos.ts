import { z } from 'zod'
import {
  LARGO_MAXIMO_DE_EMBUDO,
  LARGO_MAXIMO_DE_ETAPA,
  MAXIMO_DE_ETAPAS,
  MINIMO_DE_ETAPAS,
} from '../../../entities/embudo'
import { CLAVES_DE_COLOR } from '../../../entities/etiqueta'

// Lo que cruza el límite de los embudos: sólo la forma. Las invariantes (una inicial, una ganada y
// una perdida, nombres sin repetir, topes) las dice la base con el campo en el `hint`.
const nombre = z.string().trim().min(1).max(LARGO_MAXIMO_DE_EMBUDO)
const version = z.string().min(1)

export const esquemaCrearEmbudo = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  nombre,
})

export const esquemaGuardarEmbudo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  nombre,
})

export const esquemaEliminarEmbudo = z.object({ id: z.guid(), actualizadoEnEsperado: version })

export const esquemaGuardarEtapas = z.object({
  embudoId: z.guid(),
  actualizadoEnEsperado: version,
  etapas: z
    .array(
      z.object({
        id: z.guid().nullable(),
        nombre: z.string().trim().min(1).max(LARGO_MAXIMO_DE_ETAPA),
        color: z.enum(CLAVES_DE_COLOR),
        esInicial: z.boolean(),
        esGanada: z.boolean(),
        esPerdida: z.boolean(),
      }),
    )
    .min(MINIMO_DE_ETAPAS)
    .max(MAXIMO_DE_ETAPAS),
})
