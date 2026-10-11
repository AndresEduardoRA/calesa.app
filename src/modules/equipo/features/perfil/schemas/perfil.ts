import { z } from 'zod'

// `<uuid de la persona>/<sha-256 del contenido>.webp`: lo único que `subirAvatar()` produce.
const RUTA_AVATAR = /^[0-9a-f-]{36}\/[0-9a-f]{64}\.webp$/

export const esquemaPerfil = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: 'Escribe tu nombre y apellido.' })
    .max(120, { error: 'El nombre no puede pasar de 120 caracteres.' }),
  // Sin la clave = no tocar la foto; null = quitarla; una ruta = la que se acaba de subir.
  avatarRuta: z.string().regex(RUTA_AVATAR, { error: 'La foto no se subió bien.' }).nullish(),
  // El `actualizado_en` con el que se abrió el formulario: detecta un cambio ajeno.
  actualizadoEnEsperado: z.string().min(1),
})

// La policy de Storage sólo deja subir a la carpeta propia; la fila tampoco apunta a la de otro.
export function esAvatarDe(usuarioId: string, ruta: string): boolean {
  return ruta.startsWith(`${usuarioId}/`)
}
