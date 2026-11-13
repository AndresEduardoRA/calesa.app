// importar-csv: PostgREST y Storage por HTTP con la service key del runtime, sin `Deno` (la recibe de `index.ts`).
// Ningún error lleva el cuerpo de la respuesta ni la ruta del archivo (lleva el uid de quien importa).
import type { Dependencias, Importacion } from './procesar.ts'

const BUCKET = 'importaciones'

export function crearBase(url: string, clave: string): Omit<Dependencias, 'ahora'> {
  const cabeceras = {
    apikey: clave,
    Authorization: `Bearer ${clave}`,
    'Content-Type': 'application/json',
  }

  async function rpc<T>(nombre: string, argumentos: Record<string, unknown>): Promise<T> {
    const respuesta = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
      method: 'POST',
      headers: cabeceras,
      body: JSON.stringify(argumentos),
    })
    if (!respuesta.ok) {
      await respuesta.body?.cancel()
      throw new Error(`${nombre} respondió ${respuesta.status}`)
    }
    return (await respuesta.json()) as T
  }

  async function leerImportacion(id: string): Promise<Importacion | null> {
    const respuesta = await fetch(
      `${url}/rest/v1/importaciones?id=eq.${encodeURIComponent(id)}&select=id,entidad,archivo_ruta,estado&limit=1`,
      { headers: cabeceras },
    )
    if (!respuesta.ok) {
      await respuesta.body?.cancel()
      throw new Error(`importaciones respondió ${respuesta.status}`)
    }
    const filas = (await respuesta.json()) as Importacion[]
    return filas[0] ?? null
  }

  async function bajar(ruta: string): Promise<Uint8Array | null> {
    const camino = ruta.split('/').map(encodeURIComponent).join('/')
    const respuesta = await fetch(`${url}/storage/v1/object/${BUCKET}/${camino}`, {
      headers: { apikey: clave, Authorization: `Bearer ${clave}` },
    })
    if (respuesta.status === 400 || respuesta.status === 404) {
      await respuesta.body?.cancel()
      return null
    }
    if (!respuesta.ok) {
      await respuesta.body?.cancel()
      throw new Error(`bajar respondió ${respuesta.status}`)
    }
    return new Uint8Array(await respuesta.arrayBuffer())
  }

  async function borrar(ruta: string): Promise<boolean> {
    const respuesta = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: cabeceras,
      body: JSON.stringify({ prefixes: [ruta] }),
    })
    await respuesta.body?.cancel()
    return respuesta.ok
  }

  return { rpc, leerImportacion, bajar, borrar }
}
