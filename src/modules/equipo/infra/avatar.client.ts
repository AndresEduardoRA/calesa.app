import { fallo, type Resultado } from '@/shared/lib/errores'
import { comprimirEnTamanos, extensionDe } from '@/shared/lib/imagenes'
import { quitarSiHuerfano, subirPorHash } from '@/shared/lib/supabase/almacen.client'

// Una foto de perfil se ve como mucho a 96 px: 512 alcanza para pantallas densas. La miniatura (96) es la que dibujan las
// listas, a 32 px (cierre 1): la lista del equipo bajaba el avatar entero.
const LADO_AVATAR = 512
const LADO_MINIATURA = 96

// Achica la foto, la pasa a WebP (o a JPEG, donde el navegador no codifica WebP) y la sube a
// `avatares/<id de la persona>/<hash>.<ext>` (la policy de Storage exige que la carpeta sea la
// propia). Saca la miniatura de la misma decodificación y la sube igual. Devuelve las dos rutas para guardar en el perfil.
export async function subirAvatar(
  usuarioId: string,
  archivo: File,
): Promise<Resultado<{ ruta: string; miniatura: string }>> {
  let tamanos: Blob[]
  try {
    tamanos = (await comprimirEnTamanos(archivo, [LADO_AVATAR, LADO_MINIATURA])).map(
      (t) => t.contenido,
    )
  } catch (error) {
    console.error('No se pudo preparar la foto', error)
    return fallo('validacion', 'No se pudo leer esa imagen. Prueba con otra (JPG, PNG o WebP).')
  }
  const [grande, chica] = tamanos
  if (!grande || !chica) {
    return fallo('validacion', 'No se pudo leer esa imagen. Prueba con otra (JPG, PNG o WebP).')
  }
  const subir = (contenido: Blob) =>
    subirPorHash({
      bucket: 'avatares',
      carpeta: usuarioId,
      contenido,
      extension: extensionDe(contenido.type) ?? 'webp',
    })
  const ruta = await subir(grande)
  if (!ruta.ok) {
    return ruta
  }
  const miniatura = await subir(chica)
  if (!miniatura.ok) {
    await quitarSiHuerfano('avatares', ruta.data.ruta)
    return miniatura
  }
  return { ok: true, data: { ruta: ruta.data.ruta, miniatura: miniatura.data.ruta } }
}

// La foto anterior, o una recién subida cuyo perfil no se llegó a guardar.
export async function descartarAvatar(ruta: string): Promise<void> {
  await quitarSiHuerfano('avatares', ruta)
}
