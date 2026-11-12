import { z } from 'zod'
import {
  LARGO_MAXIMO_DIRECCION,
  LARGO_MAXIMO_SECRETO,
  LARGO_MINIMO_SECRETO,
  esDireccionDeRevalidacion,
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

// Vacía, la dirección se borra. El formulario no sabe en qué entorno corre: acepta el loopback y
// «Probar» lo corta en el servidor cuando la base es de la nube.
const direccionDeRevalidacion = z
  .string()
  .trim()
  .max(LARGO_MAXIMO_DIRECCION, { error: 'La dirección es demasiado larga.' })
  .refine(
    (direccion) => direccion === '' || esDireccionDeRevalidacion(direccion, { loopback: true }),
    {
      error: 'La dirección tiene que empezar con https:// y no puede apuntar a una red interna.',
    },
  )
  .transform((direccion) => (direccion === '' ? null : direccion))

export const esquemaGuardarWebPublica = z.object({
  actualizadoEnEsperado: version,
  activa: z.boolean().optional(),
  revalidarUrl: direccionDeRevalidacion.optional(),
})

export const esquemaGuardarPushWeb = z.object({
  actualizadoEnEsperado: version,
  activa: z.boolean(),
})

// El secreto entra una vez y no vuelve a salir: ninguna action lo devuelve.
export const esquemaGuardarSecreto = z.object({
  // Las integraciones que llevan secreto.
  clave: z.enum(['apibara', 'web_publica']),
  secreto: z
    .string()
    .trim()
    .min(LARGO_MINIMO_SECRETO, { error: 'Tiene al menos 8 caracteres.' })
    .max(LARGO_MAXIMO_SECRETO, { error: 'No puede pasar de 500 caracteres.' }),
  actualizadoEnEsperado: version,
})
