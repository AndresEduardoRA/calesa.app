// Lo común de los lectores de `pnpm env:check produccion`: el resultado de una lectura y un `GET` con `fetch` inyectado. Un fallo sólo
// dice «HTTP n» o «sin respuesta»: nunca el cuerpo, la URL ni el mensaje del error (pueden llevar un token o un valor).
export type Lectura<T> = { ok: true; datos: T } | { ok: false; motivo: string }

export type Pedir = (url: string, init: { headers: Record<string, string> }) => Promise<Response>

export async function pedirJson(
  pedir: Pedir,
  url: string,
  token: string,
): Promise<Lectura<unknown>> {
  let respuesta: Response
  try {
    respuesta = await pedir(url, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    return { ok: false, motivo: 'sin respuesta' }
  }
  if (!respuesta.ok) return { ok: false, motivo: `la API respondió HTTP ${respuesta.status}` }
  try {
    return { ok: true, datos: await respuesta.json() }
  } catch {
    return { ok: false, motivo: 'respuesta ilegible' }
  }
}
