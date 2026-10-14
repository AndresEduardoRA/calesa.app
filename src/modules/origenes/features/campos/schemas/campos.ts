import { z } from 'zod'
import {
  conReglasDeCampo,
  esquemaClave,
  esquemaEtiqueta,
  esquemaGrupo,
  esquemaOpciones,
  esquemaTextoOpcional,
  esquemaValorDefecto,
  esquemaVersion,
} from '@/shared/lib/campos'
import { CLAVES_RESERVADAS, TIPOS_DE_CAMPO } from '../../../entities/campo'

const claveApibara = esquemaTextoOpcional(60)

export const esquemaCrearCampo = conReglasDeCampo(
  z.object({
    origenId: z.guid(),
    clave: esquemaClave(CLAVES_RESERVADAS, 'Ese ya es un dato común de todos los vehículos.'),
    etiqueta: esquemaEtiqueta,
    tipo: z.enum(TIPOS_DE_CAMPO),
    opciones: esquemaOpciones,
    requerido: z.boolean(),
    grupo: esquemaGrupo,
    enTarjeta: z.boolean(),
    filtrable: z.boolean(),
    publicoWeb: z.boolean(),
    claveApibara,
    valorDefecto: esquemaValorDefecto,
  }),
)

// Lo que no viaja no se toca. Un `null` explícito vacía el grupo o la clave de apibara.
export const esquemaGuardarCampo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: esquemaVersion,
  cambios: z
    .object({
      etiqueta: esquemaEtiqueta.optional(),
      tipo: z.enum(TIPOS_DE_CAMPO).optional(),
      opciones: esquemaOpciones.optional(),
      requerido: z.boolean().optional(),
      grupo: esquemaGrupo.optional(),
      enTarjeta: z.boolean().optional(),
      filtrable: z.boolean().optional(),
      publicoWeb: z.boolean().optional(),
      claveApibara: claveApibara.optional(),
      activo: z.boolean().optional(),
      valorDefecto: esquemaValorDefecto.optional(),
    })
    .refine((cambios) => Object.values<unknown>(cambios).some((valor) => valor !== undefined), {
      error: 'No hay nada que guardar.',
    }),
})

export const esquemaMoverCampo = z.object({
  id: z.guid(),
  // «Después de X»; null = primero.
  despuesDe: z.guid().nullable(),
  actualizadoEnEsperado: esquemaVersion,
})

export const esquemaEliminarCampo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: esquemaVersion,
})

export const esquemaVistaPreviaDeCampo = z.object({ id: z.guid() })
