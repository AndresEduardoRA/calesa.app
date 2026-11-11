import { z } from 'zod'
import { Constants } from '@/shared/types/database.types'
import {
  LARGO_MAXIMO_DE_DESCRIPCION,
  LARGO_MAXIMO_DE_LUGAR,
  LARGO_MAXIMO_DE_TITULO,
} from '../../../entities/edicion'
import { TOPE_DE_DESTINATARIOS } from '../../../entities/visibilidad'

// Lo que cruza el límite de los eventos: la forma y los topes. Quién puede y a quién se invita lo dice la base.
const iso = z.iso.datetime({ offset: true })
const version = iso

// Sólo las claves de `evento_*` (`p_datos`): la base rechaza una ajena con 22023.
const datos = z.strictObject({
  titulo: z.string().trim().min(1).max(LARGO_MAXIMO_DE_TITULO).optional(),
  descripcion: z.string().max(LARGO_MAXIMO_DE_DESCRIPCION).nullable().optional(),
  lugar: z.string().max(LARGO_MAXIMO_DE_LUGAR).nullable().optional(),
  inicia_en: iso.optional(),
  termina_en: iso.nullable().optional(),
  visibilidad: z.enum(Constants.public.Enums.visibilidad_evento).optional(),
})

const destinatarios = z.array(z.guid()).max(TOPE_DE_DESTINATARIOS)

export const esquemaCrearEvento = z.object({
  // El del intento: lo genera el navegador al abrir el panel y lo conserva en cada reintento.
  id: z.guid(),
  datos: datos.required({ titulo: true, inicia_en: true }),
  destinatarios,
})

export const esquemaGuardarEvento = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  datos,
  destinatarios,
})

export const esquemaEliminarEvento = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})
