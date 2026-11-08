// Los adjuntos de una cotización desde el navegador, con la sesión de quien mira (4.27-3): leer la lista, subir el archivo al bucket privado y pedir la URL para
// bajarlo. Leer pasa por la policy de `cotizaciones_adjuntos` (ver); subir, por «cotizaciones: subir» de `storage.objects` (ver y poder adjuntar, 4-69); firmar,
// por «cotizaciones: leer» (ver). Registrar y quitar van por action (`infra/comentarios/adjuntos.ts`).
import {
  errorDePostgrest,
  fallo,
  MENSAJE_SIN_CONEXION,
  ok,
  type Resultado,
} from '@/shared/lib/errores'
import { comprimirImagen, extensionDe, hashDe } from '@/shared/lib/imagenes'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  adjuntosDesde,
  BUCKET_DE_ADJUNTOS,
  claseDeArchivo,
  MIME_DE_IMAGEN,
  MIME_DE_PDF,
  MIME_DE_WORD,
  nombreDelAdjunto,
  PESO_MAXIMO_DE_ADJUNTO,
  TOPE_DE_ADJUNTOS,
  type Adjunto,
  type ArchivoSubido,
  type MimeDeAdjunto,
} from '../../entities/comentarios/adjunto'

export const NO_SE_CARGARON_LOS_ADJUNTOS = 'No se pudieron cargar los adjuntos.'

// Lo que dura la URL para bajar un archivo: se pide al tocar «Descargar» y se usa enseguida.
const SEGUNDOS_DE_LA_URL = 60
// El contenido de una ruta nunca cambia (el nombre es su hash): un año de caché.
const UN_ANO = '31536000'

function sinRed(): boolean {
  return !window.navigator.onLine
}

// Hasta 21 filas (la base admite 20; dos a la vez pueden dejar 21), de la más nueva a la más vieja, por `cotizaciones_adjuntos_cotizacion_id_idx`: ordena a lo sumo
// esas filas. El nombre de quien subió cada una, embebido. `mio` sale del `sub` de la sesión del navegador, el mismo `auth.uid()` que mira la RPC al quitar.
export async function leerAdjuntos(cotizacionId: string): Promise<Resultado<Adjunto[]>> {
  const supabase = createClient()
  const [{ data, error }, { data: sesion }] = await Promise.all([
    supabase
      .from('cotizaciones_adjuntos')
      .select(
        'id, ruta, nombre, mime, bytes, creado_en, subido_por, autor:perfiles!cotizaciones_adjuntos_subido_por_fkey(nombre)',
      )
      .eq('cotizacion_id', cotizacionId)
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .limit(TOPE_DE_ADJUNTOS + 1),
    supabase.auth.getClaims(),
  ])
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const adjuntos = adjuntosDesde(data, sesion?.claims.sub ?? null)
  return adjuntos ? ok(adjuntos) : fallo('inesperado', NO_SE_CARGARON_LOS_ADJUNTOS)
}

type Preparado = { contenido: Blob; extension: string; mime: MimeDeAdjunto }

// Una imagen pasa a WebP ≤ 1600 px (JPEG si el navegador no codifica WebP); PDF y Word van tal cual, con su tipo (no el que diga el navegador).
async function preparar(archivo: File): Promise<Resultado<Preparado>> {
  const clase = claseDeArchivo(archivo)
  if (clase === 'pdf') {
    return ok({ contenido: archivo, extension: 'pdf', mime: MIME_DE_PDF })
  }
  if (clase === 'docx') {
    return ok({ contenido: archivo, extension: 'docx', mime: MIME_DE_WORD })
  }
  if (clase === null) {
    return fallo('validacion', `${archivo.name}: sólo PDF, imágenes o Word.`)
  }
  try {
    const imagen = await comprimirImagen(archivo)
    const extension = extensionDe(imagen.type)
    return extension
      ? ok({ contenido: imagen, extension, mime: MIME_DE_IMAGEN[extension] })
      : fallo('validacion', `No se pudo leer la imagen ${archivo.name}.`)
  } catch {
    return fallo('validacion', `No se pudo leer la imagen ${archivo.name}.`)
  }
}

// Sube el archivo a `<cotización>/<sha256>.<ext>`. Subir dos veces lo mismo no es un error: el objeto ya está y la ruta es la misma (como `subirPorHash`, que no
// admite un bucket privado). Devuelve lo que se manda a registrar.
export async function subirAdjunto(
  cotizacionId: string,
  archivo: File,
): Promise<Resultado<ArchivoSubido>> {
  const preparado = await preparar(archivo)
  if (!preparado.ok) {
    return preparado
  }
  const { contenido, extension, mime } = preparado.data
  const nombre = nombreDelAdjunto(archivo.name, extension)
  if (contenido.size > PESO_MAXIMO_DE_ADJUNTO) {
    return fallo('validacion', `${nombre} pesa más de 25 MB.`)
  }
  const ruta = `${cotizacionId}/${await hashDe(contenido)}.${extension}`
  const { error } = await createClient()
    .storage.from(BUCKET_DE_ADJUNTOS)
    .upload(ruta, contenido, { contentType: mime, cacheControl: UN_ANO, upsert: false })
  if (error && !/exists|duplicate/i.test(error.message)) {
    console.error('No se pudo subir el adjunto', error)
    return fallo(
      'inesperado',
      sinRed() ? MENSAJE_SIN_CONEXION : `No se pudo subir ${nombre}. Prueba de nuevo.`,
    )
  }
  return ok({ ruta, nombre, mime, bytes: contenido.size })
}

// La URL para bajar un adjunto con su nombre, por 60 s. Se pide al tocar «Descargar», nunca al leer la lista.
export async function urlDeDescarga(
  adjunto: Pick<Adjunto, 'ruta' | 'nombre'>,
): Promise<Resultado<string>> {
  const { data, error } = await createClient()
    .storage.from(BUCKET_DE_ADJUNTOS)
    .createSignedUrl(adjunto.ruta, SEGUNDOS_DE_LA_URL, { download: adjunto.nombre })
  if (error) {
    return fallo(
      'inesperado',
      sinRed() ? MENSAJE_SIN_CONEXION : 'No se pudo descargar el archivo. Prueba de nuevo.',
    )
  }
  return ok(data.signedUrl)
}
