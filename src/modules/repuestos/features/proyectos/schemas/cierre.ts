import { z } from 'zod'

// Lo que cruza al servidor al cerrar o reabrir un proyecto (8.09-2, C3): su clave y la versión que se vio. La base vuelve a revisar la versión (`PT409`).
export const esquemaCierreDeProyecto = z.object({
  id: z.guid(),
  actualizadoEn: z.string().min(1).max(64),
})
