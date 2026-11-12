// Subir el archivo de un documento desde el navegador (6.06-2): al bucket privado `documentos`, bajo `<unidad>/<sha-256>.<ext>`, sin comprimir (CLAUDE.md: un documento no se comprime;
// una foto de la cámara tampoco, D1). Recién después se llama `documento_registrar`. `subirPorHash` de `shared` sólo admite buckets públicos, así que el área tiene el suyo.
import { fallo, MENSAJE_SIN_CONEXION, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { extensionDelDocumento } from '../../entities/documentos/admision'

const BUCKET = 'documentos'
// El contenido de una ruta nunca cambia (el nombre es su hash): un año de caché.
const UN_ANO = '31536000'

const sinRed = () => !window.navigator.onLine

export const MENSAJE_DE_SUBIDA_FALLIDA = 'No se pudo subir el archivo. Prueba de nuevo.'

// Sube el archivo y devuelve su ruta. `hash` es el SHA-256 que ya se calculó al elegirlo. Subir dos veces lo mismo no es un error: el objeto ya está y la ruta es la misma. Un objeto
// subido y no registrado lo limpia `storage-gc`; no se borra desde aquí.
export async function subirDocumento(
  unidadId: string,
  archivo: File,
  hash: string,
): Promise<Resultado<string>> {
  const extension = extensionDelDocumento(archivo.type)
  if (extension === null) {
    return fallo('validacion', 'Ese formato no se admite como documento.')
  }
  const ruta = `${unidadId}/${hash}.${extension}`
  const { error } = await createClient()
    .storage.from(BUCKET)
    .upload(ruta, archivo, { contentType: archivo.type, cacheControl: UN_ANO, upsert: false })
  if (error && !/exists|duplicate/i.test(error.message)) {
    console.error('No se pudo subir el documento', error)
    return fallo('inesperado', sinRed() ? MENSAJE_SIN_CONEXION : MENSAJE_DE_SUBIDA_FALLIDA)
  }
  return ok(ruta)
}
