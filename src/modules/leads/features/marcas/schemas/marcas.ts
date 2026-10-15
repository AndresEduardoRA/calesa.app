import { z } from 'zod'
import { MAXIMO_DE_ETIQUETAS_POR_LEAD } from '../../../entities/etiqueta'

// Lo que cruza el límite de las marcas: sólo la forma. Si el lead se ve y si la etiqueta es de
// quien la pone lo decide la base.
export const esquemaPonerMarca = z.object({
  leadId: z.guid(),
  // Poner, no alternar: el valor que se pide.
  valor: z.boolean(),
})

export const esquemaPonerEtiquetas = z.object({
  leadId: z.guid(),
  etiquetas: z.array(z.guid()).min(1).max(MAXIMO_DE_ETIQUETAS_POR_LEAD),
  valor: z.boolean(),
})
