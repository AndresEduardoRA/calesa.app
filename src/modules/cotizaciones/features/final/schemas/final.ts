import { z } from 'zod'

// Marcar final una cotización (4.25-2): su id, sin versión esperada (P1 a).
export const esquemaMarcarFinal = z.object({ id: z.guid() })
