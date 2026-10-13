// storage-gc: borra de Storage lo que la base ya reclamó. No decide nada: reclamar recontó con el
// candado del objeto tomado, y acá sólo se borra y se confirma (supabase/functions/README.md).
// Sin dependencias: habla con PostgREST y con Storage por HTTP, con la service key del runtime.

const BASE = Deno.env.get('SUPABASE_URL') ?? ''
const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const POR_RONDA = 100
const RONDAS = 5
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type Reclamado = { bucket: string; ruta: string }
type Cuerpo =
  | { ok: true; data: { borrados: number; fallidos: number } }
  | { ok: false; error: { codigo: string; mensaje: string } }

const CABECERAS = {
  apikey: CLAVE,
  Authorization: `Bearer ${CLAVE}`,
  'Content-Type': 'application/json',
}

function responder(estado: number, cuerpo: Cuerpo): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function rpc<T>(nombre: string, argumentos: Record<string, unknown>): Promise<T> {
  const respuesta = await fetch(`${BASE}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: CABECERAS,
    body: JSON.stringify(argumentos),
  })
  if (!respuesta.ok) {
    throw new Error(`${nombre} respondió ${respuesta.status}`)
  }
  return (await respuesta.json()) as T
}

// Borrar algo que ya no está no es un error: si la corrida anterior se cayó entre borrar y
// confirmar, esta vuelve a pedirlo y lo confirma.
async function borrar(bucket: string, rutas: string[]): Promise<boolean> {
  const respuesta = await fetch(`${BASE}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE',
    headers: CABECERAS,
    body: JSON.stringify({ prefixes: rutas }),
  })
  await respuesta.body?.cancel()
  return respuesta.ok
}

function porBucket(reclamados: Reclamado[]): Map<string, string[]> {
  const grupos = new Map<string, string[]>()
  for (const { bucket, ruta } of reclamados) {
    grupos.set(bucket, [...(grupos.get(bucket) ?? []), ruta])
  }
  return grupos
}

// Acotado: hasta RONDAS × POR_RONDA objetos por corrida; lo que falte sale en la siguiente.
// Si un bucket no se pudo borrar no se confirma nada de él: sigue reclamado y la base lo vuelve a
// ofrecer pasada una hora.
async function limpiar(): Promise<{ borrados: number; fallidos: number }> {
  let borrados = 0
  let fallidos = 0
  for (let ronda = 0; ronda < RONDAS; ronda++) {
    const reclamados = await rpc<Reclamado[]>('storage_gc_reclamar', { p_max: POR_RONDA })
    for (const [bucket, rutas] of porBucket(reclamados)) {
      if (await borrar(bucket, rutas)) {
        borrados += await rpc<number>('storage_gc_confirmar', { p_bucket: bucket, p_rutas: rutas })
      } else {
        fallidos += rutas.length
      }
    }
    if (reclamados.length < POR_RONDA) {
      break
    }
  }
  return { borrados, fallidos }
}

Deno.serve(async (pedido) => {
  if (pedido.method !== 'POST') {
    return responder(405, { ok: false, error: { codigo: 'metodo', mensaje: 'Sólo POST.' } })
  }
  const cuerpo: unknown = await pedido.json().catch(() => null)
  const pase =
    typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as { pase?: unknown }).pase : null
  // Lo que no tiene forma de pase ni llega a la base.
  if (typeof pase !== 'string' || !UUID.test(pase)) {
    return responder(401, { ok: false, error: { codigo: 'sin_pase', mensaje: 'Falta el pase.' } })
  }
  try {
    if (!(await rpc<boolean>('storage_gc_abrir', { p_pase: pase }))) {
      return responder(401, {
        ok: false,
        error: { codigo: 'sin_pase', mensaje: 'El pase no vale.' },
      })
    }
    const resultado = await limpiar()
    console.info(`storage-gc: ${resultado.borrados} borrados, ${resultado.fallidos} sin borrar`)
    return responder(200, { ok: true, data: resultado })
  } catch (error) {
    console.error('storage-gc:', error instanceof Error ? error.message : 'error desconocido')
    return responder(500, {
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'No se pudo limpiar.' },
    })
  }
})
