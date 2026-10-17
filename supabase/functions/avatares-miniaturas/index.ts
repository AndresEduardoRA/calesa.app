// avatares-miniaturas: hace la miniatura de 96 px de los avatares que no la tienen (cierre 1 de la Fase 3). Lo nuevo ya
// nace con la suya (la saca el navegador al subir); esto rellena lo que existía, por lotes, cuando la llama el job con un
// pase de un uso (como storage-gc: supabase/functions/README.md). No decide nada: la base dice qué falta y guarda sólo si el
// avatar sigue siendo el mismo. Una imagen que no se puede leer queda marcada y no se reintenta cada hora.
import { decode as decodificarJpeg } from '@jsquash/jpeg'
import { decode as decodificarPng } from '@jsquash/png'
import resize from '@jsquash/resize'
import { decode as decodificarWebp, encode as codificarWebp } from '@jsquash/webp'

const BASE = Deno.env.get('SUPABASE_URL') ?? ''
const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const LADO = 96
const POR_CORRIDA = 20
// El bucket admite hasta 2 MB; más que eso no es un avatar que hayamos guardado.
const MAXIMO_DE_BYTES = 2 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type Pendiente = { usuario_id: string; avatar_ruta: string }
type Cuerpo =
  | { ok: true; data: { hechas: number; fallidas: number } }
  | { ok: false; error: { codigo: string; mensaje: string } }

const CABECERAS = { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` }

function responder(estado: number, cuerpo: Cuerpo): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function rpc<T>(nombre: string, argumentos: Record<string, unknown>): Promise<T> {
  const respuesta = await fetch(`${BASE}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: { ...CABECERAS, 'Content-Type': 'application/json' },
    body: JSON.stringify(argumentos),
  })
  if (!respuesta.ok) {
    throw new Error(`${nombre} respondió ${respuesta.status}`)
  }
  return (await respuesta.json()) as T
}

const ruta = (r: string) => r.split('/').map(encodeURIComponent).join('/')

// Por los primeros bytes, no por la extensión: lo que importa es qué hay adentro.
async function decodificar(bytes: Uint8Array): Promise<ImageData> {
  const es = (firma: number[], desde = 0) => firma.every((b, i) => bytes[desde + i] === b)
  if (es([0x52, 0x49, 0x46, 0x46]) && es([0x57, 0x45, 0x42, 0x50], 8)) {
    return await decodificarWebp(bytes.buffer as ArrayBuffer)
  }
  if (es([0xff, 0xd8, 0xff])) {
    return await decodificarJpeg(bytes.buffer as ArrayBuffer)
  }
  if (es([0x89, 0x50, 0x4e, 0x47])) {
    return await decodificarPng(bytes.buffer as ArrayBuffer)
  }
  throw new Error('No es una imagen que se pueda leer (WebP, JPEG o PNG).')
}

// El lado mayor en `LADO`, sin agrandar ni deformar (como `dimensionesAjustadas` del navegador).
function medidas(ancho: number, alto: number): { width: number; height: number } {
  const escala = Math.min(1, LADO / Math.max(ancho, alto))
  return {
    width: Math.max(1, Math.round(ancho * escala)),
    height: Math.max(1, Math.round(alto * escala)),
  }
}

async function hashDe(bytes: ArrayBuffer): Promise<string> {
  const resumen = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...resumen].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function miniaturaDe({ usuario_id, avatar_ruta }: Pendiente): Promise<'hecha' | 'cambio'> {
  const leido = await fetch(`${BASE}/storage/v1/object/avatares/${ruta(avatar_ruta)}`, {
    headers: CABECERAS,
  })
  if (!leido.ok) {
    await leido.body?.cancel()
    throw new Error(`El avatar no se pudo leer (${leido.status}).`)
  }
  const bytes = new Uint8Array(await leido.arrayBuffer())
  if (bytes.byteLength > MAXIMO_DE_BYTES) {
    throw new Error('El avatar pesa más de lo que admite el bucket.')
  }
  const imagen = await decodificar(bytes)
  const destino = medidas(imagen.width, imagen.height)
  const chica =
    destino.width === imagen.width && destino.height === imagen.height
      ? imagen
      : await resize(imagen, destino)
  const salida = await codificarWebp(chica, { quality: 82 })
  const nombre = `${usuario_id}/${await hashDe(salida)}.webp`
  const subido = await fetch(`${BASE}/storage/v1/object/avatares/${ruta(nombre)}`, {
    method: 'POST',
    headers: {
      ...CABECERAS,
      'Content-Type': 'image/webp',
      'x-upsert': 'true',
      'Cache-Control': 'max-age=31536000',
    },
    body: salida,
  })
  await subido.body?.cancel()
  if (!subido.ok) {
    throw new Error(`La miniatura no se pudo subir (${subido.status}).`)
  }
  // Si la persona cambió el avatar mientras tanto, no se guarda: el objeto queda sin nadie que lo nombre y la próxima
  // corrida hace la miniatura del avatar nuevo.
  return (await rpc<boolean>('avatar_miniatura_guardar', {
    p_usuario: usuario_id,
    p_avatar_ruta: avatar_ruta,
    p_miniatura: nombre,
  }))
    ? 'hecha'
    : 'cambio'
}

async function rellenar(): Promise<{ hechas: number; fallidas: number }> {
  const pendientes = await rpc<Pendiente[]>('avatares_miniaturas_pendientes', {
    p_max: POR_CORRIDA,
  })
  let hechas = 0
  let fallidas = 0
  for (const pendiente of pendientes) {
    try {
      if ((await miniaturaDe(pendiente)) === 'hecha') {
        hechas += 1
      }
    } catch (error) {
      console.error('avatares-miniaturas', pendiente.usuario_id, String(error))
      fallidas += 1
      await rpc<boolean>('avatar_miniatura_fallo', {
        p_usuario: pendiente.usuario_id,
        p_avatar_ruta: pendiente.avatar_ruta,
      })
    }
  }
  return { hechas, fallidas }
}

Deno.serve(async (pedido) => {
  if (pedido.method !== 'POST') {
    return responder(405, { ok: false, error: { codigo: 'metodo', mensaje: 'Sólo POST.' } })
  }
  const cuerpo = (await pedido.json().catch(() => null)) as { pase?: unknown } | null
  const pase = typeof cuerpo?.pase === 'string' ? cuerpo.pase : ''
  if (!UUID.test(pase) || !(await rpc<boolean>('storage_gc_abrir', { p_pase: pase }))) {
    return responder(403, { ok: false, error: { codigo: 'pase', mensaje: 'El pase no vale.' } })
  }
  try {
    return responder(200, { ok: true, data: await rellenar() })
  } catch (error) {
    console.error('avatares-miniaturas', String(error))
    return responder(500, {
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'No se pudo completar la corrida.' },
    })
  }
})
