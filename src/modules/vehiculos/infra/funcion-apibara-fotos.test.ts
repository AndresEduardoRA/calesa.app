// @vitest-environment node
// La edge function `apibara` (Deno) se carga en Node con un `fetch` simulado: ver el soporte.
import { describe, expect, it } from 'vitest'
import {
  BASE_APIBARA,
  CLAVE,
  FUENTE,
  ORIGEN,
  codigoDe,
  fixture,
  llamadas,
  llamar,
  manejador,
  simular,
} from './funcion-apibara.soporte'
import { readFileSync } from 'node:fs'
import { HOSTS_DE_FOTO } from '../entities/apibara'

describe('función apibara: las fotos', () => {
  const FOTO =
    'https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/0626/f8caf435090e4dc2bce7a7ffecdf7ac6_ful.jpg'

  it('baja la imagen por /image-proxy y la devuelve como bytes', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
    simular({}, () => new Response(bytes, { headers: { 'content-type': 'image/jpeg' } }))
    const respuesta = await llamar({ accion: 'foto', origen: ORIGEN, url: FOTO })
    expect(respuesta.headers.get('content-type')).toBe('application/octet-stream')
    expect([...new Uint8Array(await respuesta.arrayBuffer())]).toEqual([...bytes])
    expect(llamadas).toEqual([
      { url: `${BASE_APIBARA}/image-proxy?url=${encodeURIComponent(FOTO)}`, clave: CLAVE },
    ])
  })

  it('no descarga de un sitio que no es de las plataformas: la clave no es un proxy', async () => {
    simular(
      {},
      () => new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/jpeg' } }),
    )
    for (const url of [
      'https://example.com/a.jpg',
      'http://cs.copart.com/a.jpg',
      'https://cs.copart.com.atacante.example/a.jpg',
    ]) {
      expect(await codigoDe(await llamar({ accion: 'foto', origen: ORIGEN, url }))).toBe('entrada')
    }
    expect(llamadas).toHaveLength(0)
  })

  it('algo que no es una imagen es un problema del proveedor', async () => {
    simular({}, () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }))
    expect(await codigoDe(await llamar({ accion: 'foto', origen: ORIGEN, url: FOTO }))).toBe(
      'proveedor',
    )
  })

  it('la lista de sitios es la de las entidades', () => {
    const fuente = readFileSync(FUENTE, 'utf8')
    const lista = /const HOSTS_DE_FOTO = \[([^\]]+)\]/.exec(fuente)?.[1] ?? ''
    const hosts = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(hosts).toEqual([...HOSTS_DE_FOTO])
  })
})

describe('función apibara: el uso de la cuenta', () => {
  it('devuelve sólo plan, usadas, límite, restantes y hasta cuándo', async () => {
    simular({}, (url) =>
      url === `${BASE_APIBARA}/usage` ? Response.json(fixture('uso.json')) : undefined,
    )
    const respuesta = await llamar({ accion: 'uso' })
    const texto = await respuesta.text()
    expect(JSON.parse(texto)).toEqual({
      ok: true,
      data: { plan: 'Test', usadas: 60, limite: 100, restantes: 40, hasta: '2026-10-14' },
    })
    expect(texto).not.toContain('top_endpoints')
  })

  it('sin gestionar los ajustes de la empresa no se ve', async () => {
    simular({ puede_ver_uso: false }, () => Response.json(fixture('uso.json')))
    expect(await codigoDe(await llamar({ accion: 'uso' }))).toBe('sin_permiso')
    expect(llamadas).toHaveLength(0)
  })

  it('con una cuota agotada, el uso también lo dice', async () => {
    simular({}, () => new Response('{}', { status: 429 }))
    expect(await codigoDe(await llamar({ accion: 'uso' }))).toBe('cuota')
  })
})

describe('función apibara: CORS', () => {
  it('responde la consulta previa del navegador', async () => {
    const respuesta = await manejador(new Request('http://funcion.test/', { method: 'OPTIONS' }))
    expect(respuesta.status).toBe(204)
    expect(respuesta.headers.get('Access-Control-Allow-Headers')).toContain('authorization')
  })
})
