import { z } from 'zod'

// Lo más que tiene un lote de la papelera de cotizaciones (`cotizaciones_lote_papelera_idx`).
export const MAXIMO_POR_LOTE = 200

// Restaurar o purgar un lote, con su versión. Sin `cotizaciones` es el lote entero.
export const esquemaSobreUnLote = z.object({
  loteId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  cotizaciones: z.array(z.guid()).min(1).max(MAXIMO_POR_LOTE).optional(),
})

// Enviar a la papelera (4.24-3): cada cotización con la versión que estaba en pantalla, el texto de la base tal cual.
export const esquemaEnviarAPapelera = z.object({
  cotizaciones: z
    .array(z.object({ id: z.guid(), actualizadoEn: z.string().min(1) }))
    .min(1)
    .max(MAXIMO_POR_LOTE),
})
