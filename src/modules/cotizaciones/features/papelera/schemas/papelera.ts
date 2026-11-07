import { z } from 'zod'

// Lo más que tiene un lote de la papelera de cotizaciones (`cotizaciones_lote_papelera_idx`).
export const MAXIMO_POR_LOTE = 200

// Restaurar un lote, con su versión. Sin `cotizaciones` es el lote entero.
export const esquemaRestaurarDeLaPapelera = z.object({
  loteId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  cotizaciones: z.array(z.guid()).min(1).max(MAXIMO_POR_LOTE).optional(),
})
