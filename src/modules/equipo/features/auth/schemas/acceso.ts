// Lo que entra por los formularios de acceso. Los mensajes son los que ve la persona.
import { z } from 'zod'

// Mismo mínimo que `minimum_password_length` en supabase/config.toml.
export const LARGO_MINIMO_CONTRASENA = 8

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Escribe un correo válido, como nombre@empresa.com.' }))

const contrasenaNueva = z
  .string()
  .min(LARGO_MINIMO_CONTRASENA, {
    error: `La contraseña necesita al menos ${String(LARGO_MINIMO_CONTRASENA)} caracteres.`,
  })
  // bcrypt, que es lo que usa Auth, ignora lo que pasa de 72 bytes.
  .max(72, { error: 'La contraseña no puede pasar de 72 caracteres.' })

// A dónde volver después de ingresar. Viene de la URL: se valida al usarlo (`destinoTrasIngresar`).
const returnTo = z.string().max(2000).optional()

export const esquemaIngreso = z.object({
  email,
  // Al ingresar no se exige el largo: sólo que haya algo. Lo demás lo dice Auth.
  contrasena: z.string().min(1, { error: 'Escribe tu contraseña.' }),
  returnTo,
})

export const esquemaGoogle = z.object({ returnTo })

export const esquemaRegistro = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: 'Escribe tu nombre y apellido.' })
    .max(120, { error: 'El nombre no puede pasar de 120 caracteres.' }),
  email,
  contrasena: contrasenaNueva,
})

export const esquemaRecuperar = z.object({ email })

export const esquemaNuevaContrasena = z
  .object({ contrasena: contrasenaNueva, repetida: z.string() })
  .refine((datos) => datos.contrasena === datos.repetida, {
    path: ['repetida'],
    error: 'Las dos contraseñas tienen que ser iguales.',
  })
