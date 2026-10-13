import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { hashDe } from '@/shared/lib/imagenes'
import type { BucketPublico } from '@/shared/lib/almacen'
import { createClient } from './browser'

type Subida = {
  bucket: BucketPublico
  // Primer tramo de la ruta: las policies de Storage lo comparan (id de la persona, del vehículo…).
  carpeta: string
  contenido: Blob
  extension: string
}

// Sube desde el navegador un objeto nombrado por el hash de su contenido y devuelve su ruta.
// Subir dos veces lo mismo no es un error: el objeto ya está y la ruta es la misma.
export async function subirPorHash(subida: Subida): Promise<Resultado<{ ruta: string }>> {
  const { bucket, carpeta, contenido, extension } = subida
  const ruta = `${carpeta}/${await hashDe(contenido)}.${extension}`
  const { error } = await createClient().storage.from(bucket).upload(ruta, contenido, {
    contentType: contenido.type,
    // El contenido de una ruta nunca cambia: un año de caché.
    cacheControl: '31536000',
    upsert: false,
  })
  if (error && !/exists|duplicate/i.test(error.message)) {
    console.error('No se pudo subir a Storage', error)
    return fallo('inesperado', 'No se pudo subir el archivo. Prueba de nuevo.')
  }
  return ok({ ruta })
}

// Borra un objeto sólo si ninguna fila lo referencia (`storage_refcount`). Nunca `remove` directo:
// dos filas pueden apuntar al mismo objeto, porque el nombre es el hash del contenido. Contar y
// después borrar tiene una ventana (una fila puede nacer en el medio): alcanza para el logo y el
// avatar, que tienen un solo dueño. Las fotos de vehículos no pasan por acá: van por la cola.
export async function quitarSiHuerfano(bucket: BucketPublico, ruta: string): Promise<void> {
  const supabase = createClient()
  const { data: referencias, error } = await supabase.rpc('storage_refcount', {
    p_bucket: bucket,
    p_ruta: ruta,
  })
  if (error || referencias !== 0) {
    return
  }
  const { error: errorAlBorrar } = await supabase.storage.from(bucket).remove([ruta])
  if (errorAlBorrar) {
    // No es grave: queda un objeto que ya nadie usa.
    console.error('No se pudo borrar el objeto huérfano', errorAlBorrar)
  }
}
