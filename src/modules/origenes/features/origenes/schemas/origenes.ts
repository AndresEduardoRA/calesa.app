import { z } from 'zod'
import { PLATAFORMAS_APIBARA } from '@/shared/lib/apibara'
import { GENEROS, TIPOS_DE_ORIGEN } from '../../../entities/origen'

// La versión que tenía en pantalla quien edita: detecta un cambio ajeno.
const version = z.string().min(1)

const nombre = z
  .string()
  .trim()
  .min(2, { error: 'Escribe un nombre.' })
  .max(60, { error: 'El nombre no puede pasar de 60 caracteres.' })

const sustantivo = z
  .string()
  .trim()
  .min(2, { error: 'Escribe cómo se llama lo que entra por acá: vehículo, unidad, lote.' })
  .max(30, { error: 'No puede pasar de 30 caracteres.' })
  .regex(/^[\p{L}][\p{L} ]*$/u, { error: 'Usa sólo letras.' })

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'Elige un color.' })

const plataformas = z.array(z.enum(PLATAFORMAS_APIBARA))

// `plataformas` sólo tiene sentido en un origen de subasta: en uno manual tiene que venir vacío.
export const esquemaCrearOrigen = z
  .object({
    nombre,
    sustantivo,
    genero: z.enum(GENEROS),
    tipo: z.enum(TIPOS_DE_ORIGEN),
    color,
    plataformas,
  })
  .refine((origen) => origen.tipo === 'subasta' || origen.plataformas.length === 0, {
    path: ['plataformas'],
    error: 'Las plataformas de apibara sólo se eligen en un origen de subasta.',
  })

// Lo que no viaja no se toca. El tipo y la clave no se editan nunca.
export const esquemaGuardarOrigen = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  nombre: nombre.optional(),
  sustantivo: sustantivo.optional(),
  genero: z.enum(GENEROS).optional(),
  color: color.optional(),
  activo: z.boolean().optional(),
  plataformas: plataformas.optional(),
})

export const esquemaEliminarOrigen = z.object({ id: z.guid(), actualizadoEnEsperado: version })
