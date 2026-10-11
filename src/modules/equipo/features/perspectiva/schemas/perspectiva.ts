import { z } from 'zod'

// guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
export const esquemaVerComo = z.object({ rolId: z.guid() })
