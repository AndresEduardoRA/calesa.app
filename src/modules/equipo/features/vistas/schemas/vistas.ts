import { z } from 'zod'
import {
  LARGO_MAXIMO_DE_NOMBRE,
  PANTALLAS_CON_VISTAS,
  esquemaParamsDeVista,
} from '../../../entities/vista'

const pantalla = z.enum(PANTALLAS_CON_VISTAS)

export const esquemaGuardarVista = z.object({
  pantalla,
  nombre: z
    .string()
    .trim()
    .min(1, { error: 'Ponle un nombre a la vista.' })
    .max(LARGO_MAXIMO_DE_NOMBRE, {
      error: `El nombre no puede pasar de ${String(LARGO_MAXIMO_DE_NOMBRE)} caracteres.`,
    }),
  params: esquemaParamsDeVista,
})

export const esquemaEliminarVista = z.object({ pantalla, id: z.guid() })
