import { createClient } from './browser'

// Lo que vuelve de llamar a una edge function desde el navegador, sin excepciones. El `cuerpo` de
// un `json` es lo que la función respondió (también un `{ ok: false }`: un error esperado no es
// una caída); `bytes` es un archivo.
export type RespuestaDeFuncion =
  | { tipo: 'json'; cuerpo: unknown }
  | { tipo: 'bytes'; bytes: Blob }
  // El gateway la rechazó por la sesión (401): venció o no hay.
  | { tipo: 'sin_sesion' }
  // No llegó o la función se cayó (5xx, red).
  | { tipo: 'caida' }
  | { tipo: 'tiempo' }

const ESPERA_POR_DEFECTO_MS = 30_000

// Llama a una edge function con la sesión de quien está en el navegador. Los archivos salen de la
// función como `application/octet-stream` (el cliente decodifica otros tipos como texto).
export async function invocarFuncion(
  nombre: string,
  cuerpo: Record<string, unknown>,
  esperaMs: number = ESPERA_POR_DEFECTO_MS,
): Promise<RespuestaDeFuncion> {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  const espera = new Promise<'tiempo'>((resolver) => {
    temporizador = setTimeout(() => {
      resolver('tiempo')
    }, esperaMs)
  })
  try {
    const resultado = await Promise.race([
      createClient().functions.invoke<unknown>(nombre, { body: cuerpo }),
      espera,
    ])
    if (resultado === 'tiempo') {
      return { tipo: 'tiempo' }
    }
    if (resultado.error) {
      const contexto: unknown = (resultado.error as { context?: unknown }).context
      const estado = contexto instanceof Response ? contexto.status : null
      return estado === 401 ? { tipo: 'sin_sesion' } : { tipo: 'caida' }
    }
    return resultado.data instanceof Blob
      ? { tipo: 'bytes', bytes: resultado.data }
      : { tipo: 'json', cuerpo: resultado.data }
  } catch {
    return { tipo: 'caida' }
  } finally {
    clearTimeout(temporizador)
  }
}
