import { z } from 'zod'
import { LARGO_MAXIMO_DE_ETAPA, MAXIMO_DE_ETAPAS, MINIMO_DE_ETAPAS } from '../../../entities/embudo'
import { CLAVES_DE_COLOR } from '../../../entities/etiqueta'

// Lo que cruza el límite de las plantillas: sólo la forma. Las reglas (una inicial, una ganada y una perdida, nombres sin repetir, las
// variables del mensaje) las dice la base con el campo en el `hint`.
const version = z.string().min(1)

export const esquemaGuardarPlantillaDelEmbudo = z.object({
  actualizadoEnEsperado: version,
  // Nulas: vuelven las de fábrica. Sin id: no son etapas de ningún embudo (`z.object` descarta el local de la pantalla).
  etapas: z
    .array(
      z.object({
        nombre: z.string().trim().min(1).max(LARGO_MAXIMO_DE_ETAPA),
        color: z.enum(CLAVES_DE_COLOR),
        esInicial: z.boolean(),
        esGanada: z.boolean(),
        esPerdida: z.boolean(),
      }),
    )
    .min(MINIMO_DE_ETAPAS)
    .max(MAXIMO_DE_ETAPAS)
    .nullable(),
})

export const esquemaGuardarMensajeDelPortal = z.object({
  actualizadoEnEsperado: version,
  // Nulo: vuelve el de fábrica. El largo fino (1000 caracteres) y las variables los dice la base; esto sólo pone un techo.
  texto: z.string().max(4000).nullable(),
})
