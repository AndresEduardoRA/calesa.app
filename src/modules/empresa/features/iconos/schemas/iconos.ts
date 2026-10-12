import { z } from 'zod'
import { esquemaIconos } from '../../../entities/iconos'

export const esquemaGuardarIconos = z.object({
  // Las rutas de los cinco íconos recién subidos, o null para volver a los neutros.
  iconos: esquemaIconos.nullable(),
  // El `actualizado_en` de los ajustes que tenía en pantalla quien regenera.
  actualizadoEnEsperado: z.string().min(1),
})
