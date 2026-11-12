import { z } from 'zod'
import { AMBITOS_DE_FLUJO } from '../../../entities/flujo'

// Lo que pide la franja: el flujo y su ámbito (el ámbito decide qué permiso se mira antes de la RPC).
export const esquemaLeerAvisos = z.object({ flujoId: z.guid(), ambito: z.enum(AMBITOS_DE_FLUJO) })
