import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { comprimirImagen, extensionDe, LADO_MAXIMO_FOTO } from '@/shared/lib/imagenes'
import { subirPorHash } from '@/shared/lib/supabase/almacen.client'

const MOTIVO_NO_ES_IMAGEN = 'Elige una imagen (JPG, PNG o WebP).'
const MOTIVO_NO_SE_PUDO_LEER = 'No se pudo leer esa imagen. Prueba con otra.'

// Prepara una foto (WebP de hasta 1600 px) y la sube al bucket `web` con el hash de su contenido; devuelve su ruta relativa, la que va en
// el documento. Subir dos veces lo mismo es el mismo objeto. `carpeta` es el primer tramo de la ruta (las guías, `guias`).
export async function subirImagenDelSitio(
  archivo: File,
  carpeta: string = 'guias',
): Promise<Resultado<{ ruta: string }>> {
  if (!archivo.type.startsWith('image/')) {
    return fallo('validacion', MOTIVO_NO_ES_IMAGEN)
  }
  let contenido: Blob
  try {
    contenido = await comprimirImagen(archivo, LADO_MAXIMO_FOTO, 'image/webp')
  } catch {
    return fallo('validacion', MOTIVO_NO_SE_PUDO_LEER)
  }
  const extension = extensionDe(contenido.type)
  if (!extension) {
    return fallo('validacion', MOTIVO_NO_SE_PUDO_LEER)
  }
  const subida = await subirPorHash({ bucket: 'web', carpeta, contenido, extension })
  return subida.ok ? ok({ ruta: subida.data.ruta }) : subida
}
