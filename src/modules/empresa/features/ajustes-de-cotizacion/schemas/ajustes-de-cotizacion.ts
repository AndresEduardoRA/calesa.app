import { z } from 'zod'
import { VIGENCIA_MAXIMA_DIAS, VIGENCIA_MINIMA_DIAS } from '../../../entities/ajustes-de-cotizacion'

const RANGO_DE_VIGENCIA = `La vigencia va de ${VIGENCIA_MINIMA_DIAS} a ${VIGENCIA_MAXIMA_DIAS} días.`

// Lo mismo que rechaza la base (22023), dicho antes de llegar a ella.
export const esquemaGuardarAjustesDeCotizacion = z.object({
  vigenciaDias: z
    .int({ error: RANGO_DE_VIGENCIA })
    .min(VIGENCIA_MINIMA_DIAS, { error: RANGO_DE_VIGENCIA })
    .max(VIGENCIA_MAXIMA_DIAS, { error: RANGO_DE_VIGENCIA }),
  vehiculoObligatorioAlCotizar: z.boolean(),
  // El `actualizado_en` que tenía en pantalla quien edita: detecta un cambio ajeno.
  actualizadoEnEsperado: z.string().min(1),
})

export type EntradaDeGuardarAjustesDeCotizacion = z.input<typeof esquemaGuardarAjustesDeCotizacion>
