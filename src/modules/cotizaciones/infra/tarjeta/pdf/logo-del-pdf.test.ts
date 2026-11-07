// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tarjetaDesde } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { modeloDeLaTarjeta } from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import { calculoDePrueba, crudaDeLaTarjeta } from '../../../entities/tarjeta/tarjeta.soporte'

vi.mock('server-only', () => ({}))

import { logoDelPdf } from './logo-del-pdf'

// El logo del PDF (4.18-3a, C14, P2): se baja en el servidor con tope y espera, y sólo va si react-pdf lo dibuja fiel.
const URL_DEL_LOGO = 'http://127.0.0.1:54721/storage/v1/object/public/marca/logos/abc.png'
const LOGO = { nombre: 'Importadora', url: URL_DEL_LOGO }
const TOPE = 1024 * 1024

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46])
const WEBP = new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')
const svg = (cuerpo: string, prologo = '') =>
  new TextEncoder().encode(
    `${prologo}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${cuerpo}</svg>`,
  )
const SVG_SIMPLE = svg('<rect width="10" height="10" fill="#0a7f3c"/>')

let llamadas: string[] = []
let responder: (url: string, init: RequestInit | undefined) => Promise<Response>
const avisos = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

beforeEach(() => {
  llamadas = []
  avisos.mockClear()
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    llamadas.push(String(url))
    return responder(String(url), init)
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const con = (bytes: Uint8Array<ArrayBuffer>, cabeceras: Record<string, string> = {}) => {
  responder = () => Promise.resolve(new Response(bytes, { status: 200, headers: cabeceras }))
}
const bajar = (mas: Partial<Parameters<typeof logoDelPdf>[0]> = {}) =>
  logoDelPdf({ logo: LOGO, tope: TOPE, ...mas })

describe('logoDelPdf: qué logo dibuja el PDF', () => {
  it.each([
    ['PNG', PNG, 'png'],
    ['JPEG', JPEG, 'jpg'],
    ['un SVG simple', SVG_SIMPLE, 'svg'],
    [
      'un SVG con prólogo XML',
      svg('<rect width="1" height="1"/>', '<?xml version="1.0"?>\n'),
      'svg',
    ],
  ])('%s se dibuja', async (_nombre, bytes, tipo) => {
    con(bytes)
    const logo = await bajar()
    expect(logo?.tipo).toBe(tipo)
    expect(logo && Buffer.compare(logo.datos, Buffer.from(bytes))).toBe(0)
    expect(llamadas).toEqual([URL_DEL_LOGO])
  })

  it.each([
    ['<style>', '<style>.a{fill:#0a7f3c}</style><rect class="a" width="10" height="10"/>'],
    ['class=', '<rect class="a" width="10" height="10"/>'],
    ['<use', '<use href="#a"/>'],
    ['<symbol', '<symbol id="a"/>'],
    ['<mask', '<mask id="a"/>'],
    ['<filter', '<filter id="a"/>'],
    ['<pattern', '<pattern id="a"/>'],
    ['<image', '<image href="http://127.0.0.1:9/otro.png" width="10" height="10"/>'],
  ])(
    'un SVG con %s no se dibuja (react-pdf lo dibujaría distinto o bajaría otro archivo)',
    async (_que, cuerpo) => {
      con(svg(cuerpo))
      expect(await bajar()).toBeNull()
      expect(llamadas).toEqual([URL_DEL_LOGO])
    },
  )

  it('un WebP no se dibuja', async () => {
    con(WEBP)
    expect(await bajar()).toBeNull()
  })

  it('algo que no es una imagen no se dibuja', async () => {
    con(new TextEncoder().encode('<html>hola</html>'))
    expect(await bajar()).toBeNull()
  })
})

describe('logoDelPdf: lo que pesa, tarda o falla no va, y no lanza', () => {
  it('más pesado que el tope, por content-length, no se dibuja', async () => {
    con(PNG, { 'content-length': String(TOPE + 1) })
    expect(await bajar()).toBeNull()
  })

  it('más pesado que el tope al leerlo, sin content-length, no se dibuja', async () => {
    const grande = new Uint8Array(64)
    grande.set(PNG)
    con(grande)
    expect(await bajar({ tope: 32 })).toBeNull()
  })

  it('si no responde a tiempo, o con la señal ya abortada, no se dibuja', async () => {
    responder = (_url, init) =>
      new Promise((_resolver, rechazar) => {
        // Como el `fetch` de verdad: con la señal ya abortada rechaza en el acto.
        if (init?.signal?.aborted) {
          rechazar(init.signal.reason)
        }
        init?.signal?.addEventListener('abort', () => {
          rechazar(init.signal?.reason)
        })
      })
    expect(await bajar({ esperaMs: 10 })).toBeNull()
    expect(await bajar({ signal: AbortSignal.abort() })).toBeNull()
  })

  it('un 404 o un fetch que lanza no se dibujan, y ninguno lanza', async () => {
    responder = () => Promise.resolve(new Response('no', { status: 404 }))
    expect(await bajar()).toBeNull()
    responder = () => Promise.reject(new TypeError('fetch failed'))
    expect(await bajar()).toBeNull()
  })

  it('lo que no se dibuja lo avisa por consola con su motivo, sin la URL', async () => {
    con(WEBP)
    await bajar()
    expect(avisos).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(avisos.mock.calls)).not.toContain(URL_DEL_LOGO)
  })

  it('sin logo que pedir no baja nada: una plantilla sin logo no lo pide; sin plantilla, sí', async () => {
    con(PNG)
    const pagina = {
      fecha: '',
      vehiculo: null,
      asesor: null,
      numero: 1,
      vencida: false,
      logo: LOGO,
    }
    const modeloCon = (cruda: unknown) => {
      const lectura = tarjetaDesde(cruda)
      if (lectura === null) {
        throw new Error('La tarjeta de prueba no cumple su esquema.')
      }
      return modeloDeLaTarjeta({ lectura, calculo: calculoDePrueba(), monedaBs: null, pagina })
    }
    expect(
      await logoDelPdf({ logo: modeloCon(crudaDeLaTarjeta({ logo: false })).logo, tope: TOPE }),
    ).toBeNull()
    expect(await logoDelPdf({ logo: null, tope: TOPE })).toBeNull()
    expect(llamadas).toEqual([])
    expect(
      (await logoDelPdf({ logo: modeloCon({ estado: 'sin_plantilla' }).logo, tope: TOPE }))?.tipo,
    ).toBe('png')
    expect(llamadas).toEqual([URL_DEL_LOGO])
  })
})
