import { z } from 'zod'

// Los dos documentos llegan tal como los emite el editor (`unknown`): `cambiosDeLegales` los reduce a la lista blanca y la base los valida.
const legal = z.object({ titulo: z.string(), doc: z.unknown() })

export const esquemaGuardarLegales = z.object({
  actualizadoEnEsperado: z.string().min(1),
  terminos: legal,
  privacidad: legal,
})
