import { z } from 'zod'
import {
  TIPOS_DE_LEAD,
  conReglasDeCampo,
  esquemaClave,
  esquemaEtiqueta,
  esquemaGrupo,
  esquemaOpciones,
  esquemaValorDefecto,
  esquemaVersion,
} from '@/shared/lib/campos'
import { CLAVES_RESERVADAS_DE_LEAD, DATOS_DE_LA_EMPRESA } from '../../../entities/campo'

const datoDeLaEmpresa = z.enum(DATOS_DE_LA_EMPRESA).nullable()

export const esquemaCrearCampo = conReglasDeCampo(
  z.object({
    clave: esquemaClave(CLAVES_RESERVADAS_DE_LEAD, 'Ese ya es un dato fijo de todos los leads.'),
    etiqueta: esquemaEtiqueta,
    tipo: z.enum(TIPOS_DE_LEAD),
    opciones: esquemaOpciones,
    requerido: z.boolean(),
    grupo: esquemaGrupo,
    enTabla: z.boolean(),
    filtrable: z.boolean(),
    soloCartera: z.boolean(),
    valorDefecto: esquemaValorDefecto,
    valorDefectoEmpresa: datoDeLaEmpresa,
  }),
)
  .refine((campo) => campo.valorDefectoEmpresa === null || campo.tipo === 'texto', {
    path: ['valorDefectoEmpresa'],
    error: 'El dato de la empresa sólo se usa en un campo de texto.',
  })
  .refine((campo) => campo.valorDefectoEmpresa === null || campo.valorDefecto === null, {
    path: ['valorDefecto'],
    error: 'Un campo lleva un valor por defecto o el de la empresa, no los dos.',
  })

// Lo que no viaja no se toca. Un `null` explícito vacía el grupo, el valor por defecto o el de la
// empresa.
export const esquemaGuardarCampo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: esquemaVersion,
  cambios: z
    .object({
      etiqueta: esquemaEtiqueta.optional(),
      tipo: z.enum(TIPOS_DE_LEAD).optional(),
      opciones: esquemaOpciones.optional(),
      requerido: z.boolean().optional(),
      grupo: esquemaGrupo.optional(),
      enTabla: z.boolean().optional(),
      filtrable: z.boolean().optional(),
      soloCartera: z.boolean().optional(),
      activo: z.boolean().optional(),
      valorDefecto: esquemaValorDefecto.optional(),
      valorDefectoEmpresa: datoDeLaEmpresa.optional(),
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
