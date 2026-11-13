// importar-csv: procesa una importación total de `/datos` (9.06). La llaman la app (tras `importacion_pase_emitir`) o el job
// `importaciones-continuar` con un pase de un uso; lo canjea con `importacion_abrir` por el id de la importación, baja el archivo
// normalizado del bucket `importaciones`, lo valida contra la plantilla y procesa por lotes de 50 hasta 45 s
// (supabase/functions/README.md). A nombre de quién y qué entidad lo dice la fila de `importaciones`, nunca el pedido.
import { crearBase } from './base.ts'
import { procesarImportacion, type Resultado } from './procesar.ts'

const BASE = Deno.env.get('SUPABASE_URL') ?? ''
const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// Lo único de un error que se registra: qué RPC o pedido respondió qué estado.
const ERROR_DE_PEDIDO = /^[a-z_]+ respondió \d{3}$/

type Cuerpo =
  { ok: true; data: Resultado } | { ok: false; error: { codigo: string; mensaje: string } }

function responder(estado: number, cuerpo: Cuerpo): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  })
}

const error = (estado: number, codigo: string, mensaje: string) =>
  responder(estado, { ok: false, error: { codigo, mensaje } })

Deno.serve(async (pedido) => {
  const inicio = Date.now()
  if (pedido.method !== 'POST') {
    return error(405, 'metodo', 'Sólo POST.')
  }
  const cuerpo: unknown = await pedido.json().catch(() => null)
  const pase =
    typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as { pase?: unknown }).pase : null
  // Lo que no tiene forma de pase ni llega a la base.
  if (typeof pase !== 'string' || !UUID.test(pase)) {
    return error(401, 'sin_pase', 'Falta el pase.')
  }
  const base = crearBase(BASE, CLAVE)
  try {
    const id = await base.rpc<string | null>('importacion_abrir', { p_pase: pase })
    if (typeof id !== 'string') {
      return error(401, 'sin_pase', 'El pase no vale.')
    }
    const resultado = await procesarImportacion(id, { ...base, ahora: Date.now }, inicio)
    console.info(
      `importar-csv: ${resultado.importacion} ${resultado.estado} ${resultado.procesadas ?? '-'}/${resultado.filas_total ?? '-'}`,
    )
    return responder(200, { ok: true, data: resultado })
  } catch (e) {
    const mensaje =
      e instanceof Error && ERROR_DE_PEDIDO.test(e.message) ? e.message : 'error inesperado'
    console.error('importar-csv:', mensaje)
    return error(500, 'inesperado', 'No se pudo procesar la importación.')
  }
})
