import { z } from 'zod'

// El motivo de anular un comprobante (4.26-2): de 1 a 500 caracteres sin los espacios de los lados, como lo pide `comprobante_anular` (22023, `hint` `motivo`).
// Aparte de `comprobante.ts`: Zod sólo viaja con el modal de anular, que se pide al abrirse.
export const MOTIVO_MAXIMO = 500

// El texto de la base.
export const MENSAJE_DEL_MOTIVO = 'Anular pide un motivo de hasta 500 caracteres.'

export const esquemaDelMotivo = z
  .string()
  .trim()
  .min(1, { error: MENSAJE_DEL_MOTIVO })
  .max(MOTIVO_MAXIMO, { error: MENSAJE_DEL_MOTIVO })
