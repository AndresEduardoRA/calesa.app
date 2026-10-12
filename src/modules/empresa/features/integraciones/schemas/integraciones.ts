import { z } from 'zod'
import {
  LARGO_MAXIMO_SECRETO,
  LARGO_MINIMO_SECRETO,
  esquemaConfigApibara,
} from '../../../entities/integraciones'

// El `actualizado_en` que tenía en pantalla quien edita: detecta un cambio ajeno.
const version = z.string().min(1)

// Lo que no viaja no se toca: prender o apagar no manda la configuración, y al revés. Los campos
// de la configuración van sueltos y no dentro de un objeto: next-safe-action sólo devuelve los
// errores de validación del primer nivel, y uno anidado fallaría sin decir por qué.
export const esquemaGuardarApibara = z
  .object({
    actualizadoEnEsperado: version,
    activa: z.boolean().optional(),
    endpoint: esquemaConfigApibara.shape.endpoint.optional(),
    plataformas: esquemaConfigApibara.shape.plataformas.optional(),
  })
  .refine((pedido) => (pedido.endpoint === undefined) === (pedido.plataformas === undefined), {
    path: ['endpoint'],
    error: 'La configuración se guarda entera: la dirección y las plataformas.',
  })

// El secreto entra una vez y no vuelve a salir: ninguna action lo devuelve.
export const esquemaGuardarSecreto = z.object({
  // Las integraciones que llevan secreto.
  clave: z.literal('apibara'),
  secreto: z
    .string()
    .trim()
    .min(LARGO_MINIMO_SECRETO, { error: 'La clave tiene al menos 8 caracteres.' })
    .max(LARGO_MAXIMO_SECRETO, { error: 'La clave no puede pasar de 500 caracteres.' }),
  actualizadoEnEsperado: version,
})
