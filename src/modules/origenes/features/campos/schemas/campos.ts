import { z } from 'zod'
import { CLAVES_RESERVADAS, TIPOS_DE_CAMPO, tieneOpciones } from '../../../entities/campo'

const version = z.string().min(1)

const etiqueta = z
  .string()
  .trim()
  .min(2, { error: 'Escribe un nombre.' })
  .max(60, { error: 'El nombre no puede pasar de 60 caracteres.' })

const clave = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,40}$/, {
    error: 'La clave usa minúsculas, números y guion bajo, y empieza con una letra.',
  })
  .refine((valor) => !CLAVES_RESERVADAS.includes(valor), {
    error: 'Ese ya es un dato común de todos los vehículos.',
  })

const opcion = z.object({
  clave: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_]{0,40}$/, { error: 'La clave de la opción no es válida.' }),
  etiqueta: z.string().trim().min(1, { error: 'Cada opción necesita un nombre.' }).max(60),
})

const opciones = z
  .array(opcion)
  .max(60, { error: 'Hasta 60 opciones.' })
  .refine((lista) => new Set(lista.map((o) => o.clave)).size === lista.length, {
    error: 'Hay dos opciones con el mismo nombre.',
  })

const grupo = z
  .string()
  .trim()
  .max(40, { error: 'El grupo no puede pasar de 40 caracteres.' })
  .transform((valor) => (valor === '' ? null : valor))
  .nullable()

const claveApibara = z
  .string()
  .trim()
  .max(60, { error: 'No puede pasar de 60 caracteres.' })
  .transform((valor) => (valor === '' ? null : valor))
  .nullable()

export const esquemaCrearCampo = z
  .object({
    origenId: z.guid(),
    clave,
    etiqueta,
    tipo: z.enum(TIPOS_DE_CAMPO),
    opciones,
    requerido: z.boolean(),
    grupo,
    enTarjeta: z.boolean(),
    filtrable: z.boolean(),
    publicoWeb: z.boolean(),
    claveApibara,
  })
  .refine((campo) => !tieneOpciones(campo.tipo) || campo.opciones.length > 0, {
    path: ['opciones'],
    error: 'Un campo de opciones necesita al menos una.',
  })
  .refine((campo) => tieneOpciones(campo.tipo) || campo.opciones.length === 0, {
    path: ['opciones'],
    error: 'Sólo un campo de opciones lleva opciones.',
  })

// Lo que no viaja no se toca. Un `null` explícito vacía el grupo o la clave de apibara.
export const esquemaGuardarCampo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  cambios: z
    .object({
      etiqueta: etiqueta.optional(),
      tipo: z.enum(TIPOS_DE_CAMPO).optional(),
      opciones: opciones.optional(),
      requerido: z.boolean().optional(),
      grupo: grupo.optional(),
      enTarjeta: z.boolean().optional(),
      filtrable: z.boolean().optional(),
      publicoWeb: z.boolean().optional(),
      claveApibara: claveApibara.optional(),
      activo: z.boolean().optional(),
    })
    .refine((cambios) => Object.values<unknown>(cambios).some((valor) => valor !== undefined), {
      error: 'No hay nada que guardar.',
    }),
})

export const esquemaMoverCampo = z.object({
  id: z.guid(),
  // «Después de X»; null = primero.
  despuesDe: z.guid().nullable(),
  actualizadoEnEsperado: version,
})

export const esquemaEliminarCampo = z.object({ id: z.guid(), actualizadoEnEsperado: version })

export const esquemaVistaPreviaDeCampo = z.object({ id: z.guid() })
