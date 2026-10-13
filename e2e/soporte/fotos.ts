// Lo que necesitan los e2e de fotos: imágenes distintas hechas en memoria (no hay ninguna de
// prueba en el repo), lo que quedó en la base y en Storage, y la limpieza de lo que subieron.
import { crc32, deflateSync } from 'node:zlib'
import { admin, entorno } from './base'

function trozo(tipo: string, datos: Buffer): Buffer {
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'latin1'), datos])
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const suma = Buffer.alloc(4)
  suma.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, suma])
}

// Un PNG de un solo color, distinto para cada número: distinto contenido, distinto hash. Más
// grande que la miniatura (480 px), para que la completa y la miniatura sean dos objetos.
function pngDeColor(numero: number, ancho = 800, alto = 600): Buffer {
  const color = [(numero * 47) % 256, (numero * 89) % 256, (numero * 131) % 256]
  const fila = Buffer.concat([Buffer.from([0]), Buffer.from(Array(ancho).fill(color).flat())])
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(ancho, 0)
  cabecera.writeUInt32BE(alto, 4)
  // 8 bits por canal, RGB, sin entrelazado.
  cabecera.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cabecera),
    trozo('IDAT', deflateSync(Buffer.concat(Array<Buffer>(alto).fill(fila)))),
    trozo('IEND', Buffer.alloc(0)),
  ])
}

export type ArchivoDePrueba = { name: string; mimeType: string; buffer: Buffer }

// Las fotos `desde`..`hasta`, como las recibe `setInputFiles`. El mismo número es siempre la
// misma foto.
export function fotos(desde: number, hasta = desde): ArchivoDePrueba[] {
  return Array.from({ length: hasta - desde + 1 }, (_, indice) => ({
    name: `foto-${desde + indice}.png`,
    mimeType: 'image/png',
    buffer: pngDeColor(desde + indice),
  }))
}

export type FotoEnLaBase = {
  id: string
  hash: string
  ruta: string
  ruta_miniatura: string
  orden: number
  es_portada: boolean
}

function exigir(error: { message: string } | null, que: string): void {
  if (error) {
    throw new Error(`No se pudo ${que}: ${error.message}`)
  }
}

// Las fotos de un vehículo, en su orden.
export async function fotosDe(vehiculoId: string): Promise<FotoEnLaBase[]> {
  const { data, error } = await admin()
    .from('vehiculos_imagenes')
    .select('id, hash, ruta, ruta_miniatura, orden, es_portada')
    .eq('vehiculo_id', vehiculoId)
    .order('orden')
    .returns<FotoEnLaBase[]>()
  exigir(error, 'leer las fotos')
  return data ?? []
}

// Lo que ese vehículo tiene esperando la limpieza de Storage.
export async function enColaDe(vehiculoId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from('cola_gc_storage')
    .select('ruta')
    .eq('bucket', 'vehiculos')
    .like('ruta', `${vehiculoId}/%`)
    .returns<{ ruta: string }[]>()
  exigir(error, 'leer la cola de limpieza')
  return (data ?? []).map((fila) => fila.ruta)
}

// Los objetos que hay en la carpeta de un vehículo.
export async function objetosDe(vehiculoId: string): Promise<string[]> {
  const { data, error } = await admin().storage.from('vehiculos').list(vehiculoId, { limit: 200 })
  exigir(error, 'listar la carpeta del vehículo')
  return (data ?? []).map((objeto) => `${vehiculoId}/${objeto.name}`)
}

// La dirección pública de un objeto: la que usa la página.
export function urlDeObjeto(ruta: string): string {
  const base = entorno('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/vehiculos/${ruta}`
}

// Lo que los e2e subieron al bucket: nadie lo borra desde la app, así que se borra acá.
export async function borrarFotosDe(vehiculoIds: string[]): Promise<void> {
  for (const vehiculoId of vehiculoIds) {
    const rutas = await objetosDe(vehiculoId)
    if (rutas.length > 0) {
      exigir((await admin().storage.from('vehiculos').remove(rutas)).error, 'borrar los objetos')
    }
    exigir(
      (await admin().from('cola_gc_storage').delete().like('ruta', `${vehiculoId}/%`)).error,
      'vaciar la cola',
    )
  }
}
