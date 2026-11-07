import { afterEach, describe, expect, it, vi } from 'vitest'
import { pedirElPdf } from './descarga-del-pdf.client'

const RUTA = '/cotizaciones/00000000-0000-4000-8000-0000000000aa/pdf'

function responder(respuesta: Response | Error) {
  const espia = vi.fn<typeof fetch>(() =>
    respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta),
  )
  vi.stubGlobal('fetch', espia)
  return espia
}

const pdf = () =>
  new Response(new Uint8Array([37, 80, 68, 70]), {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
  })

// Lo que el navegador da con `redirect: 'manual'` ante un 307: una respuesta opaca, de estado 0.
const redireccionOpaca = () => {
  const r = new Response(null, { status: 200 })
  Object.defineProperty(r, 'type', { value: 'opaqueredirect' })
  Object.defineProperty(r, 'status', { value: 0 })
  Object.defineProperty(r, 'ok', { value: false })
  return r
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pedirElPdf', () => {
  it('pide la ruta sin seguir la redirección ni guardar en caché', async () => {
    const espia = responder(pdf())
    await pedirElPdf(RUTA)
    expect(espia).toHaveBeenCalledWith(RUTA, { redirect: 'manual', cache: 'no-store' })
  })

  it('un 200 con un PDF da sus bytes', async () => {
    responder(pdf())
    const r = await pedirElPdf(RUTA)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(new Uint8Array(await r.data.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]))
    }
  })

  it('un 404 es no_encontrado', async () => {
    responder(new Response('secreto', { status: 404 }))
    const r = await pedirElPdf(RUTA)
    expect(r.ok ? null : r.error.codigo).toBe('no_encontrado')
  })

  it('la redirección al ingreso es no_autenticado', async () => {
    responder(redireccionOpaca())
    const r = await pedirElPdf(RUTA)
    expect(r.ok ? null : r.error.codigo).toBe('no_autenticado')
  })

  it('un 500 es inesperado y no lleva el cuerpo de la respuesta', async () => {
    responder(new Response('detalle interno', { status: 500 }))
    const r = await pedirElPdf(RUTA)
    expect(r.ok ? null : r.error.codigo).toBe('inesperado')
    expect(r.ok ? '' : r.error.mensaje).not.toContain('detalle interno')
  })

  it('un 200 que no es un PDF (la página de ingreso) es inesperado', async () => {
    responder(new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } }))
    const r = await pedirElPdf(RUTA)
    expect(r.ok ? null : r.error.codigo).toBe('inesperado')
  })

  it('sin red es inesperado', async () => {
    responder(new TypeError('Failed to fetch'))
    const r = await pedirElPdf(RUTA)
    expect(r.ok ? null : r.error.codigo).toBe('inesperado')
  })
})
