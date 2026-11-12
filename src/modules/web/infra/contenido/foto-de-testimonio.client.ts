import { fallo, type Resultado } from '@/shared/lib/errores'
import { comprimirImagen } from '@/shared/lib/imagenes'
import { quitarSiHuerfano, subirPorHash } from '@/shared/lib/supabase/almacen.client'

export const NO_SE_LEYO_LA_FOTO = 'No se pudo leer esa imagen. Prueba con otra (JPG, PNG o WebP).'

// Achica la foto (WebP, ≤ 1600 px; JPEG donde el navegador no codifica WebP) y la sube al bucket `web` en `testimonios/<hash>.<ext>` (la policy del bucket
// pide `web.contenido.gestionar` y no mira la carpeta). Devuelve la ruta para guardarla en el testimonio.
export async function subirFotoDeTestimonio(archivo: File): Promise<Resultado<{ ruta: string }>> {
  let contenido: Blob
  try {
    contenido = await comprimirImagen(archivo)
  } catch (error) {
    console.error('No se pudo preparar la foto del testimonio', error)
    return fallo('validacion', NO_SE_LEYO_LA_FOTO)
  }
  return subirPorHash({
    bucket: 'web',
    carpeta: 'testimonios',
    contenido,
    extension: contenido.type === 'image/jpeg' ? 'jpg' : 'webp',
  })
}

// La foto anterior de un testimonio, o una recién subida cuyo testimonio no se llegó a guardar: se borra sólo si ninguna fila la usa
// (`storage_refcount`; `web_testimonios` no tiene trigger de limpieza).
export async function descartarFotoDeTestimonio(ruta: string): Promise<void> {
  await quitarSiHuerfano('web', ruta)
}
