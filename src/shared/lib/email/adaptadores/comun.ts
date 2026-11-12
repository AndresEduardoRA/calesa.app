import { fallo, type Resultado } from '../../errores'
import type { Remitente } from '../tipos'

// Lo que comparten los adaptadores REST (Resend, Cloudflare): el pedido con tope de tiempo y los errores como valores. Un mensaje de
// error nunca lleva una clave ni el texto libre del proveedor (puede traer correos de personas): a lo sumo un código corto.
const TOPE_DEL_PEDIDO_MS = 10_000

export type RespuestaDelProveedor = { respuesta: Response; json: unknown }

type Pedido = {
  pedir: typeof fetch
  proveedor: string
  url: string
  cabeceras: Record<string, string>
  cuerpo: unknown
}

export async function pedirJson({
  pedir,
  proveedor,
  url,
  cabeceras,
  cuerpo,
}: Pedido): Promise<Resultado<RespuestaDelProveedor>> {
  let respuesta: Response
  try {
    respuesta = await pedir(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'importadora', ...cabeceras },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TOPE_DEL_PEDIDO_MS),
    })
  } catch {
    return fallo('inesperado', `El correo no salió: ${proveedor} no respondió.`)
  }
  const json: unknown = await respuesta.json().catch(() => null)
  return { ok: true, data: { respuesta, json } }
}

const CODIGO_CORTO = /^[a-z_0-9]{1,40}$/

// El error de un pedido que el proveedor no aceptó. `variables` es lo que hay que revisar si rechazó la clave.
export function rechazoDe(
  proveedor: string,
  variables: string,
  estado: number,
  codigo?: string | number,
): Resultado<never> {
  if (estado === 401 || estado === 403)
    return fallo(
      'inesperado',
      `El correo no salió: ${proveedor} rechazó la clave (${String(estado)}). Revisa ${variables}.`,
    )
  if (estado === 429)
    return fallo(
      'inesperado',
      `El correo no salió: ${proveedor} pidió esperar (429); intenta en un rato.`,
    )
  const detalle =
    typeof codigo === 'number' || (typeof codigo === 'string' && CODIGO_CORTO.test(codigo))
      ? ` (${String(codigo)})`
      : ''
  return fallo(
    'inesperado',
    `El correo no salió: ${proveedor} respondió ${String(estado)}${detalle}.`,
  )
}

// `"Nombre" <correo>` con el nombre sin lo que rompe la cabecera; sin nombre, sólo el correo.
export function remitenteEnTexto(remitente: Remitente): string {
  const nombre = remitente.nombre.replace(/["<>\\\r\n]/g, '').trim()
  return nombre ? `"${nombre}" <${remitente.email}>` : remitente.email
}
