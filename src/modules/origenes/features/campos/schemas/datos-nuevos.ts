import { z } from 'zod'

// Las rutas de los datos nuevos que se quieren agregar como campo. La base vuelve a comprobar que
// cada una la trajo de verdad algún vehículo del origen.
export const esquemaAgregarDatosDeApibara = z.object({
  origenId: z.guid(),
  rutas: z
    .array(
      z
        .string()
        .min(1)
        .max(200)
        .regex(/^[A-Za-z0-9_$]+(\.[A-Za-z0-9_$]+)*$/),
    )
    .min(1)
    .max(200),
})
