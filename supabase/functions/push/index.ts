// push: envía el push web de una notificación. La llama la base (`push_disparar()` por pg_net) con un pase de un
// uso; canjea el pase con `push_abrir`, firma y cifra con Web Crypto, envía a cada suscripción del destinatario y
// anota el resultado con `push_resultado` (supabase/functions/README.md). Sin dependencias.
import { armarCarga, enviarPush, type Estado, type Suscripcion } from './enviar.ts'
import { importarClaves } from './vapid.ts'

const BASE = Deno.env.get('SUPABASE_URL') ?? ''
const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type Abierto = { titulo: unknown; cuerpo: unknown; ruta: unknown; suscripciones: Suscripcion[] }
type Cuenta = { enviadas: number; caducadas: number; fallos: number }
type Cuerpo = { ok: true; data: Cuenta } | { ok: false; error: { codigo: string; mensaje: string } }

function responder(estado: number, cuerpo: Cuerpo): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  })
}

const error = (estado: number, codigo: string, mensaje: string) =>
  responder(estado, { ok: false, error: { codigo, mensaje } })

async function rpc<T>(nombre: string, argumentos: Record<string, unknown>): Promise<T> {
  const respuesta = await fetch(`${BASE}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: {
      apikey: CLAVE,
      Authorization: `Bearer ${CLAVE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(argumentos),
  })
  if (!respuesta.ok) {
    throw new Error(`${nombre} respondió ${respuesta.status}`)
  }
  return (await respuesta.json()) as T
}

function contar(estados: Estado[]): Cuenta {
  return {
    enviadas: estados.filter((estado) => estado === 'enviada').length,
    caducadas: estados.filter((estado) => estado === 'caducada').length,
    fallos: estados.filter((estado) => estado === 'fallo').length,
  }
}

// Las claves se leen por pedido y después del canje: un pase inválido no dice si el push está configurado (D16).
async function enviarTodo(pase: string, abierto: Abierto): Promise<Response> {
  const publica = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
  const privada = Deno.env.get('VAPID_PRIVATE_KEY')
  const sujeto = Deno.env.get('VAPID_SUBJECT')
  if (!publica || !privada || !sujeto) {
    return error(200, 'sin_claves', 'Faltan las claves VAPID de la función.')
  }
  const importadas = await importarClaves({ publica, privada, sujeto })
  if (!importadas.ok) {
    return error(200, 'claves_invalidas', 'Las claves VAPID no tienen el formato esperado.')
  }
  const carga = armarCarga(abierto)
  const ahora = Date.now()
  const estados = await Promise.all(
    abierto.suscripciones.map((suscripcion) =>
      enviarPush({ suscripcion, carga, claves: importadas.claves, fetch, ahora }),
    ),
  )
  if (estados.length > 0) {
    const resultados = abierto.suscripciones.map(({ id }, i) => ({ id, estado: estados[i] }))
    const aceptado = await rpc<unknown>('push_resultado', {
      p_pase: pase,
      p_resultados: resultados,
    })
    if (aceptado === null) {
      console.warn('push: resultado no aceptado')
    }
  }
  return responder(200, { ok: true, data: contar(estados) })
}

Deno.serve(async (pedido) => {
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
  try {
    const abierto = await rpc<Abierto | null>('push_abrir', { p_pase: pase })
    if (abierto === null) {
      return error(401, 'sin_pase', 'El pase no vale.')
    }
    return await enviarTodo(pase, abierto)
  } catch (falla) {
    console.error('push:', falla instanceof Error ? falla.message : 'error desconocido')
    return error(500, 'inesperado', 'No se pudo enviar.')
  }
})
