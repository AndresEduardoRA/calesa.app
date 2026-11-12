// El comprobante de un gasto desde el navegador (6.11-1): se valida, se sube al bucket privado `comprobantes` bajo `<unidad>/<sha-256>.<ext>` y se firma una URL corta
// para verlo. Un documento no se comprime (CLAUDE.md). `subirPorHash` de `shared` sólo admite buckets públicos, así que el área tiene el suyo.
import { fallo, MENSAJE_SIN_CONEXION, ok, type Resultado } from '@/shared/lib/errores'
import { hashDe } from '@/shared/lib/imagenes'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  extensionDelComprobante,
  MENSAJE_DE_COMPROBANTE_INVALIDO,
  PESO_MAXIMO_DE_COMPROBANTE,
} from '../../entities/dinero/comprobante'

const BUCKET = 'comprobantes'
const SEGUNDOS_DE_LA_URL = 60
// El contenido de una ruta nunca cambia (el nombre es su hash): un año de caché.
const UN_ANO = '31536000'

const sinRed = () => !window.navigator.onLine

// Sube el archivo y devuelve su ruta. Subir dos veces lo mismo no es un error: el objeto ya está y la ruta es la misma. Un objeto subido y no guardado lo limpia
// `storage-gc`; no se borra desde aquí (D2 de 6.10-2).
export async function subirComprobante(
  unidadId: string,
  archivo: File,
): Promise<Resultado<string>> {
  const extension = extensionDelComprobante(archivo.type)
  if (extension === null || archivo.size > PESO_MAXIMO_DE_COMPROBANTE) {
    return fallo('validacion', MENSAJE_DE_COMPROBANTE_INVALIDO)
  }
  const ruta = `${unidadId}/${await hashDe(archivo)}.${extension}`
  const { error } = await createClient()
    .storage.from(BUCKET)
    .upload(ruta, archivo, { contentType: archivo.type, cacheControl: UN_ANO, upsert: false })
  if (error && !/exists|duplicate/i.test(error.message)) {
    console.error('No se pudo subir el comprobante', error)
    return fallo(
      'inesperado',
      sinRed() ? MENSAJE_SIN_CONEXION : 'No se pudo subir el comprobante. Prueba de nuevo.',
    )
  }
  return ok(ruta)
}

// La URL para ver el comprobante, por 60 s. Se pide al tocar «Ver comprobante», nunca al leer la lista.
export async function urlDelComprobante(ruta: string): Promise<Resultado<string>> {
  const { data, error } = await createClient()
    .storage.from(BUCKET)
    .createSignedUrl(ruta, SEGUNDOS_DE_LA_URL)
  if (error) {
    return fallo(
      'inesperado',
      sinRed() ? MENSAJE_SIN_CONEXION : 'No se pudo abrir el comprobante. Prueba de nuevo.',
    )
  }
  return ok(data.signedUrl)
}
