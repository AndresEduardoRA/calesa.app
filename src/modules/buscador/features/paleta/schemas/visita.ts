import { z } from 'zod'
import { TIPOS_DEL_BUSCADOR } from '../../../entities/resultados'

export const esquemaDeVisita = z.object({ tipo: z.enum(TIPOS_DEL_BUSCADOR), id: z.guid() })
