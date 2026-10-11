import { fallo, type Resultado } from '@/shared/lib/errores'
import { comprimirImagen } from '@/shared/lib/imagenes'
import { quitarSiHuerfano, subirPorHash } from '@/shared/lib/supabase/almacen.client'

// Una foto de perfil se ve como mucho a 96 px: 512 alcanza para pantallas densas.
const LADO_AVATAR = 512

// Achica la foto, la pasa a WebP y la sube a `avatares/<id de la persona>/<hash>.webp` (la
// policy de Storage exige que la carpeta sea la propia). Devuelve la ruta para guardar en el perfil.
export async function subirAvatar(
  usuarioId: string,
  archivo: File,
): Promise<Resultado<{ ruta: string }>> {
  let comprimida: Blob
  try {
    comprimida = await comprimirImagen(archivo, LADO_AVATAR)
  } catch (error) {
    console.error('No se pudo preparar la foto', error)
    return fallo('validacion', 'No se pudo leer esa imagen. Prueba con otra (JPG, PNG o WebP).')
  }
  return subirPorHash({
    bucket: 'avatares',
    carpeta: usuarioId,
    contenido: comprimida,
    extension: 'webp',
  })
}

// La foto anterior, o una recién subida cuyo perfil no se llegó a guardar.
export async function descartarAvatar(ruta: string): Promise<void> {
  await quitarSiHuerfano('avatares', ruta)
}
