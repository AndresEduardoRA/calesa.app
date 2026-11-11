// @vitest-environment node
// Contrato de la función `push` (supabase/functions/push): firma VAPID (RFC 8292), cifrado aes128gcm (RFC 8291) contra un
// oráculo independiente (`http_ece`), la clasificación de la respuesta y la defensa contra el proxy abierto. Ver el soporte.
import { createPublicKey, verify } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  aWebCrypto,
  b64url,
  cargar,
  clavesVapidDePrueba,
  ece,
  fetchSimulado,
  suscriptor,
  type Carga,
  type ClavesVapid,
  type ModuloCifrar,
  type ModuloEnviar,
  type ModuloVapid,
} from './push-soporte'

const AHORA = Date.UTC(2026, 10, 11, 12)
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123'
const CARGA: Carga = {
  titulo: 'Te asignaron una tarea',
  cuerpo: 'Llamar a Ana por el Corolla',
  ruta: '/agenda',
}

let vapid: ModuloVapid
let cifrar: ModuloCifrar['cifrar']
let enviarPush: ModuloEnviar['enviarPush']
let crudas: { publica: string; privada: string; sujeto: string }
let claves: ClavesVapid

beforeAll(async () => {
  vapid = await cargar<ModuloVapid>('vapid.ts')
  cifrar = (await cargar<ModuloCifrar>('cifrar.ts')).cifrar
  enviarPush = (await cargar<ModuloEnviar>('enviar.ts')).enviarPush
  crudas = await clavesVapidDePrueba()
  const importadas = await vapid.importarClaves(crudas)
  if (!importadas.ok) {
    throw new Error('las claves de prueba no se importaron')
  }
  claves = importadas.claves
})

function enviarA(endpoint: string, responder: (url: string) => Response | Error) {
  const { fetch, pedidos } = fetchSimulado(responder)
  const { ecdh, claves: delNavegador } = suscriptor()
  const estado = enviarPush({
    suscripcion: { id: '11111111-1111-4111-8111-111111111111', endpoint, claves: delNavegador },
    carga: CARGA,
    claves,
    fetch,
    ahora: AHORA,
  })
  return { estado, pedidos, ecdh, delNavegador }
}

// Desarma `vapid t=<jwt>, k=<pública>`; exige base64url sin relleno en cada segmento.
function desarmarVapid(autorizacion: string) {
  const partes = /^vapid t=([^,]+), k=(.+)$/.exec(autorizacion)
  const segmentos = (partes?.[1] ?? '').split('.')
  const base64url = segmentos.every((segmento) => /^[A-Za-z0-9_-]+$/.test(segmento))
  const [cabecera = '', reclamos = '', firma = ''] = segmentos
  return { k: partes?.[2] ?? '', segmentos: segmentos.length, base64url, cabecera, reclamos, firma }
}

// Verifica con node:crypto (no con la API que firmó) y con la pública que viaja en k=.
function firmaValida({ k, cabecera, reclamos, firma }: ReturnType<typeof desarmarVapid>): boolean {
  const punto = Buffer.from(k, 'base64url')
  const publica = createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: b64url(punto.subarray(1, 33)),
      y: b64url(punto.subarray(33, 65)),
    },
    format: 'jwk',
  })
  const firmado = Buffer.from(`${cabecera}.${reclamos}`)
  return verify(
    'sha256',
    firmado,
    { key: publica, dsaEncoding: 'ieee-p1363' },
    Buffer.from(firma, 'base64url'),
  )
}

const json = (segmento: string) =>
  JSON.parse(Buffer.from(segmento, 'base64url').toString()) as Record<string, unknown>

describe('push: firma VAPID', () => {
  it('POST al endpoint con TTL, aes128gcm y un JWT ES256 que verifica con la pública de k=', async () => {
    const { estado, pedidos } = enviarA(ENDPOINT, () => new Response(null, { status: 201 }))
    expect(await estado).toBe('enviada')
    expect(pedidos).toHaveLength(1)
    const pedido = pedidos[0]
    expect(pedido?.url).toBe(ENDPOINT)
    expect(pedido?.init?.method).toBe('POST')
    expect(pedido?.init?.redirect).toBe('manual')
    expect(pedido?.cabeceras.get('TTL')).toBe('86400')
    expect(pedido?.cabeceras.get('Content-Encoding')).toBe('aes128gcm')

    const vapidDelPedido = desarmarVapid(pedido?.cabeceras.get('Authorization') ?? '')
    expect(vapidDelPedido.k).toBe(crudas.publica)
    expect(vapidDelPedido.segmentos).toBe(3)
    expect(vapidDelPedido.base64url).toBe(true)
    expect(json(vapidDelPedido.cabecera)).toEqual({ typ: 'JWT', alg: 'ES256' })
    const { aud, exp, sub } = json(vapidDelPedido.reclamos)
    expect(aud).toBe('https://fcm.googleapis.com')
    expect(sub).toBe(crudas.sujeto)
    expect(exp).toBeGreaterThan(AHORA / 1000)
    expect(exp).toBeLessThanOrEqual(AHORA / 1000 + 24 * 3600)
    expect(firmaValida(vapidDelPedido)).toBe(true)
  })

  it('claves de largo malo, sin 0x04 o con un sujeto que no es mailto ni https no se importan', async () => {
    const corta = b64url(Buffer.from(crudas.privada, 'base64url').subarray(0, 31))
    const sinPunto = Buffer.from(crudas.publica, 'base64url')
    sinPunto[0] = 0x03
    expect((await vapid.importarClaves({ ...crudas, privada: corta })).ok).toBe(false)
    expect((await vapid.importarClaves({ ...crudas, publica: b64url(sinPunto) })).ok).toBe(false)
    expect((await vapid.importarClaves({ ...crudas, sujeto: 'avisos@ejemplo.test' })).ok).toBe(
      false,
    )
  })
})

describe('push: cifrado aes128gcm contra http_ece', () => {
  it('el cuerpo que se envía lo descifra http_ece con la clave del navegador', async () => {
    const { estado, pedidos, ecdh, delNavegador } = enviarA(
      ENDPOINT,
      () => new Response(null, { status: 201 }),
    )
    await estado
    const cuerpo = pedidos[0]?.cuerpo
    expect(cuerpo).toBeInstanceOf(Uint8Array)
    const claro = ece.decrypt(Buffer.from(cuerpo ?? []), {
      version: 'aes128gcm',
      privateKey: ecdh,
      authSecret: delNavegador.auth,
    })
    expect(JSON.parse(claro.toString('utf8'))).toEqual(CARGA)
  })

  it('con la misma sal y el mismo remitente, sale byte a byte igual que http_ece.encrypt', async () => {
    const { claves: delNavegador } = suscriptor()
    const remitente = suscriptor().ecdh
    const sal = new Uint8Array(16).map((_, i) => i * 7 + 3)
    const texto = new TextEncoder().encode(JSON.stringify(CARGA))
    const nuestro = await cifrar(texto, delNavegador, {
      sal,
      remitente: await aWebCrypto(remitente),
    })
    const suyo = ece.encrypt(Buffer.from(texto), {
      version: 'aes128gcm',
      dh: delNavegador.p256dh,
      privateKey: remitente,
      salt: b64url(sal),
      authSecret: delNavegador.auth,
    })
    expect(Buffer.from(nuestro ?? []).toString('hex')).toBe(suyo.toString('hex'))
  })

  it('un p256dh o un auth de largo malo no se cifran y no se envían', async () => {
    const { claves: buenas } = suscriptor()
    const texto = new TextEncoder().encode('x')
    expect(await cifrar(texto, { ...buenas, auth: b64url(new Uint8Array(15)) })).toBeNull()
    expect(await cifrar(texto, { ...buenas, p256dh: b64url(new Uint8Array(64)) })).toBeNull()
  })
})

describe('push: clasificación de la respuesta', () => {
  it.each([
    [201, 'enviada'],
    [404, 'caducada'],
    [410, 'caducada'],
    [307, 'fallo'],
    [403, 'fallo'],
    [429, 'fallo'],
    [500, 'fallo'],
    [503, 'fallo'],
  ] as const)('%i → %s', async (estado, esperado) => {
    const { estado: resultado } = enviarA(ENDPOINT, () => new Response(null, { status: estado }))
    expect(await resultado).toBe(esperado)
  })

  it('un fetch que lanza es un fallo, y enviarPush no lanza', async () => {
    const { estado } = enviarA(ENDPOINT, () => new TypeError('sin red'))
    expect(await estado).toBe('fallo')
  })
})

describe('push: no es un proxy abierto', () => {
  it.each([
    'http://fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'https://a@fcm.googleapis.com/x',
    'https://fcm.googleapis.com.ejemplo.com/x',
    'https://xnotify.windows.com/x',
    'https://fcm.googleapis.com\\@ejemplo.com/x',
    'https://ejemplo.com/fcm.googleapis.com',
  ])('%s → fallo sin llamar a fetch', async (endpoint) => {
    const { estado, pedidos } = enviarA(endpoint, () => new Response(null, { status: 201 }))
    expect(await estado).toBe('fallo')
    expect(pedidos).toHaveLength(0)
  })

  it.each([
    'https://x.notify.windows.com/y',
    'https://updates.push.services.mozilla.com/wpush/v2/z',
    'https://web.push.apple.com/q',
  ])('%s sí se envía', async (endpoint) => {
    const { estado, pedidos } = enviarA(endpoint, () => new Response(null, { status: 201 }))
    expect(await estado).toBe('enviada')
    expect(pedidos).toHaveLength(1)
  })
})
