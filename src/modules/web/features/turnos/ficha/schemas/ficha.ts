import { z } from 'zod'
import {
  CARGO_MAX,
  ESPECIALIDADES_MAX,
  ESPECIALIDAD_MAX,
  MENSAJE_HANDLE,
  MENSAJE_SIN_WHATSAPP,
  MENSAJE_WHATSAPP,
  PRESENTACION_MAX,
  esHandle,
  esWhatsapp,
  especialidadesDeTexto,
} from '../../../../entities/turnos/ficha'

// «Tu ficha en la web» (8.05-2). Un texto vacío vale y vacía el campo (en la base queda nulo); el identificador se pasa a minúsculas antes de mirarlo. Lo único que se
// pide junto es el WhatsApp para aparecer en la web (la base no lo exige, pero el contacto directo lo necesita).
export const esquemaFicha = z
  .object({
    whatsapp: z
      .string()
      .trim()
      .refine((valor) => valor === '' || esWhatsapp(valor), { error: MENSAJE_WHATSAPP }),
    handle: z
      .string()
      .trim()
      .transform((valor) => valor.toLowerCase())
      .refine((valor) => valor === '' || esHandle(valor), { error: MENSAJE_HANDLE }),
    cargo: z
      .string()
      .trim()
      .max(CARGO_MAX, { error: `El cargo lleva hasta ${CARGO_MAX} caracteres.` }),
    presentacion: z
      .string()
      .trim()
      .max(PRESENTACION_MAX, {
        error: `La presentación lleva hasta ${PRESENTACION_MAX} caracteres.`,
      }),
    especialidades: z
      .string()
      .transform(especialidadesDeTexto)
      .refine((lista) => lista.length <= ESPECIALIDADES_MAX, {
        error: `Hasta ${ESPECIALIDADES_MAX} especialidades.`,
      })
      .refine((lista) => lista.every((una) => una.length <= ESPECIALIDAD_MAX), {
        error: `Cada especialidad lleva hasta ${ESPECIALIDAD_MAX} caracteres.`,
      }),
    publicoWeb: z.boolean(),
    actualizadoEnEsperado: z.string().min(1),
  })
  .refine((ficha) => !ficha.publicoWeb || ficha.whatsapp !== '', {
    path: ['whatsapp'],
    error: MENSAJE_SIN_WHATSAPP,
  })

export type EntradaDeFicha = z.infer<typeof esquemaFicha>
