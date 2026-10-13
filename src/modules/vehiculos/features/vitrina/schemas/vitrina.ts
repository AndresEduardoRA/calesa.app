import { z } from 'zod'
import { LARGO_DE_NOTA_DE_PRECIO, PRECIO_PUBLICO_MAXIMO } from '../../../entities/vitrina'

const precio = z.number().min(0).max(PRECIO_PUBLICO_MAXIMO).nullable()

// El estado entero de la vitrina de un vehículo, ya validado por `validarVitrina()` en el
// navegador. Acá se vuelve a acotar; la base lo comprueba otra vez.
export const esquemaPublicarEnVitrina = z
  .object({
    vehiculoId: z.guid(),
    // La versión que tenía en pantalla quien publica.
    actualizadoEnEsperado: z.string().min(1),
    publicado: z.boolean(),
    precio,
    precioHasta: precio,
    nota: z.string().trim().min(1).max(LARGO_DE_NOTA_DE_PRECIO).nullable(),
    destacado: z.boolean(),
  })
  .refine((datos) => datos.precioHasta === null || datos.precio !== null, {
    error: 'Para poner un «hasta» falta el precio público.',
    path: ['precioHasta'],
  })
  .refine(
    (datos) =>
      datos.precioHasta === null || datos.precio === null || datos.precioHasta >= datos.precio,
    { error: 'No puede ser menor que el precio público.', path: ['precioHasta'] },
  )
