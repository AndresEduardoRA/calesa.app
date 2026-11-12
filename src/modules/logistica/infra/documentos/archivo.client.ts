// Ver o descargar un documento desde el navegador (6.06-1): URL firmada de 60 s sobre el bucket privado `documentos`. Se pide al tocar, nunca al leer la lista. La policy de lectura de
// `storage.objects` deja leer el objeto a quien ve alguna fila viva de esa ruta.
import { fallo, MENSAJE_SIN_CONEXION, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'

const BUCKET = 'documentos'
const SEGUNDOS_DE_LA_URL = 60

export const NO_SE_PUDO_ABRIR_EL_DOCUMENTO = 'No se pudo abrir el documento. Prueba de nuevo.'

export async function urlDelDocumento(
  ruta: string,
  { descargar }: { descargar: { nombre: string } | null },
): Promise<Resultado<string>> {
  const { data, error } = await createClient()
    .storage.from(BUCKET)
    .createSignedUrl(
      ruta,
      SEGUNDOS_DE_LA_URL,
      descargar ? { download: descargar.nombre } : undefined,
    )
  if (error) {
    return fallo(
      'inesperado',
      window.navigator.onLine ? NO_SE_PUDO_ABRIR_EL_DOCUMENTO : MENSAJE_SIN_CONEXION,
    )
  }
  return ok(data.signedUrl)
}
