import { z } from 'zod'

// Lo que cruza al servidor al restaurar un proyecto eliminado (8.09-4, C8): su clave y el `eliminado_en` que devolvió eliminar. La base vuelve a revisarlo (`PT409`).
export const esquemaRestaurarProyecto = z.object({
  id: z.guid(),
  eliminadoEn: z.string().min(1).max(64),
})
