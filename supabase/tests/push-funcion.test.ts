// @vitest-environment node
// La función `push` entera (supabase/functions/push/index.ts): el pase antes que las claves, sin claves no se envía
// nada, y el resultado de cada suscripción vuelve a la base con `push_resultado`. Ver el soporte.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  b64url,
  BASE_DE_PRUEBA,
  cargarFuncion,
  clavesVapidDePrueba,
  entorno,
  llamarFuncion,
  SERVICIO,
  simularBase,
  suscriptor,
  type Llamada,
  type VariableVapid,
  VARIABLES_VAPID,
} from './push-soporte'

const CARGA = { titulo: 'Te asignaron una tarea', cuerpo: 'Llamar a Ana', ruta: '/agenda' }
let crudas: Awaited<ReturnType<typeof clavesVapidDePrueba>>

const PASE = '22222222-2222-4222-8222-222222222222'
const VAPID = VARIABLES_VAPID
const ids = [
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
] as const
const endpoints = [
  'https://fcm.googleapis.com/fcm/send/uno',
  'https://updates.push.services.mozilla.com/wpush/v2/dos',
  'https://x.notify.windows.com/w/?token=tres',
] as const
const abierto = () => ({
  ...CARGA,
  suscripciones: ids.map((id, i) => ({
    id,
    endpoint: endpoints[i],
    claves: suscriptor().claves,
  })),
})
const conClaves = () => {
  entorno.NEXT_PUBLIC_VAPID_PUBLIC_KEY = crudas.publica
  entorno.VAPID_PRIVATE_KEY = crudas.privada
  entorno.VAPID_SUBJECT = crudas.sujeto
}
const rpcs = (llamadas: Llamada[]) => llamadas.filter((l) => l.url.startsWith(`${BASE_DE_PRUEBA}/`))

const sinClaves: { falta: VariableVapid | 'privada de 31 bytes'; codigo: string }[] = [
  ...VAPID.map((falta) => ({ falta, codigo: 'sin_claves' })),
  { falta: 'privada de 31 bytes', codigo: 'claves_invalidas' },
]

describe('push: la función', () => {
  beforeAll(async () => {
    crudas = await clavesVapidDePrueba()
    await cargarFuncion()
  })
  afterEach(() => {
    for (const nombre of VAPID) {
      entorno[nombre] = undefined
    }
  })
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('lo que no tiene forma de pase no llega a la base', async () => {
    conClaves()
    const llamadas = simularBase(abierto())
    const { estado, json } = await llamarFuncion({ pase: 'x' })
    expect(estado).toBe(401)
    expect(json).toMatchObject({ ok: false, error: { codigo: 'sin_pase' } })
    expect(llamadas).toHaveLength(0)
  })

  it('un pase que push_abrir rechaza da 401 aun sin claves: no dice si el push está configurado', async () => {
    const llamadas = simularBase(null)
    const { estado, json } = await llamarFuncion({ pase: PASE })
    expect(estado).toBe(401)
    expect(json).toMatchObject({ ok: false, error: { codigo: 'sin_pase' } })
    expect(llamadas.map((l) => l.url)).toEqual([`${BASE_DE_PRUEBA}/rest/v1/rpc/push_abrir`])
  })

  it.each(sinClaves)(
    'sin $falta → $codigo, sin enviar nada ni anotar resultado',
    async ({ falta, codigo }) => {
      conClaves()
      if (falta === 'privada de 31 bytes') {
        entorno.VAPID_PRIVATE_KEY = b64url(Buffer.from(crudas.privada, 'base64url').subarray(0, 31))
      } else {
        entorno[falta] = undefined
      }
      const llamadas = simularBase(abierto())
      const { estado, json } = await llamarFuncion({ pase: PASE })
      expect(estado).toBe(200)
      expect(json).toMatchObject({ ok: false, error: { codigo } })
      expect(llamadas.map((l) => l.url)).toEqual([`${BASE_DE_PRUEBA}/rest/v1/rpc/push_abrir`])
    },
  )

  it('envía a cada suscripción y anota enviada, caducada y fallo con la service key', async () => {
    conClaves()
    const llamadas = simularBase(abierto(), {
      [endpoints[0]]: 201,
      [endpoints[1]]: 410,
      [endpoints[2]]: 503,
    })
    const { estado, json } = await llamarFuncion({ pase: PASE })
    expect(estado).toBe(200)
    expect(json).toEqual({ ok: true, data: { enviadas: 1, caducadas: 1, fallos: 1 } })
    expect(
      llamadas
        .filter((l) => !l.url.startsWith(BASE_DE_PRUEBA))
        .map((l) => l.url)
        .sort(),
    ).toEqual([...endpoints].sort())
    const [abrir, resultado] = rpcs(llamadas)
    expect(abrir?.cuerpo).toEqual({ p_pase: PASE })
    expect(resultado?.url).toBe(`${BASE_DE_PRUEBA}/rest/v1/rpc/push_resultado`)
    expect(resultado?.cuerpo).toEqual({
      p_pase: PASE,
      p_resultados: [
        { id: ids[0], estado: 'enviada' },
        { id: ids[1], estado: 'caducada' },
        { id: ids[2], estado: 'fallo' },
      ],
    })
    expect(rpcs(llamadas).map((l) => l.autorizacion)).toEqual([
      `Bearer ${SERVICIO}`,
      `Bearer ${SERVICIO}`,
    ])
  })
})
