import { z } from 'zod'
import { CLAVES_PERMISO } from '@/shared/lib/permisos'
import { COLORES_DE_ROL, claveDeRol } from '../../../entities/rol'

const COLORES = COLORES_DE_ROL.map((color) => color.valor)

export const esquemaCrearRol = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: 'Escribe el nombre del rol.' })
    .max(40, { error: 'El nombre es muy largo: usa hasta 40 caracteres.' })
    // De cada nombre sale la clave del rol; uno hecho sólo de números o signos no da ninguna.
    .refine((nombre) => claveDeRol(nombre) !== null, {
      error: 'Usa un nombre con letras, como «Ventas» o «Logística».',
    }),
  color: z.enum(COLORES, { error: 'Elige un color de la lista.' }),
})

// guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
const edicionDeRol = {
  rolId: z.guid(),
  // La versión del rol que tenía en pantalla quien edita (ISO).
  actualizadoEnEsperado: z.string().min(1),
}

export const esquemaEliminarRol = z.object(edicionDeRol)

export const esquemaOtorgar = z.object({
  ...edicionDeRol,
  clave: z.enum(CLAVES_PERMISO),
  // null = todos los orígenes.
  origenId: z.guid().nullable(),
  alcance: z.enum(['propios', 'todos']),
})

export const esquemaRevocar = z.object({
  ...edicionDeRol,
  clave: z.enum(CLAVES_PERMISO),
  origenId: z.guid().nullable(),
})
