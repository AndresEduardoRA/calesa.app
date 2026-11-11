import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const SECRETO = 'secreto-que-no-sale-de-aca'

// El cliente de quien prueba: si tiene el permiso y qué fila de `web_publica` ve.
let tienePermiso = true
let fila: { config: unknown; secreto_guardado_en: string | null } | null = null
// La base del despliegue: decide si el loopback se puede probar.
let urlDeLaBase = 'http://127.0.0.1:54621'
const llamadasDelAdmin: [string, unknown][] = []

const crearAdmin = vi.fn(() => ({
  rpc: (nombre: string, argumentos: unknown) => {
    llamadasDelAdmin.push([nombre, argumentos])
    return Promise.resolve({ data: SECRETO, error: null })
  },
}))

vi.mock('@/shared/lib/supabase/admin', () => ({ createAdminClient: crearAdmin }))

vi.mock('@/shared/config/entorno', () => ({
  entornoPublico: () => ({ NEXT_PUBLIC_SUPABASE_URL: urlDeLaBase }),
}))

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      rpc: () => Promise.resolve({ data: tienePermiso, error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: fila, error: null }) }),
        }),
      }),
    }),
}))

const pedir = vi.fn<typeof fetch>()

const { probarRevalidacion } = await import('./revalidacion-prueba')

function conDireccion(revalidar_url: string) {
  fila = { config: { revalidar_url }, secreto_guardado_en: '2026-11-11T18:00:00+00:00' }
}

beforeEach(() => {
  tienePermiso = true
  urlDeLaBase = 'http://127.0.0.1:54621'
  conDireccion('https://sitio.com/api/revalidar')
  llamadasDelAdmin.length = 0
  crearAdmin.mockClear()
  pedir.mockReset()
  pedir.mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', pedir)
})

describe('probarRevalidacion', () => {
  it('sin permiso no crea el admin ni pide nada', async () => {
    tienePermiso = false
    const resultado = await probarRevalidacion()
    expect(resultado.ok ? null : resultado.error.codigo).toBe('sin_permiso')
    expect(crearAdmin).not.toHaveBeenCalled()
    expect(pedir).not.toHaveBeenCalled()
  })

  it('sin secreto guardado no crea el admin', async () => {
    fila = { config: { revalidar_url: 'https://sitio.com/x' }, secreto_guardado_en: null }
    const resultado = await probarRevalidacion()
    expect(resultado.ok ? null : resultado.error.codigo).toBe('regla')
    expect(crearAdmin).not.toHaveBeenCalled()
  })

  it('sin dirección guardada no crea el admin', async () => {
    fila = { config: { revalidar_url: null }, secreto_guardado_en: '2026-11-11T18:00:00+00:00' }
    const resultado = await probarRevalidacion()
    expect(resultado.ok ? null : resultado.error.codigo).toBe('regla')
    expect(crearAdmin).not.toHaveBeenCalled()
  })

  it('una red interna no se prueba y el secreto no se lee', async () => {
    conDireccion('https://10.0.0.1/x')
    const resultado = await probarRevalidacion()
    expect(resultado.ok ? null : resultado.error.codigo).toBe('regla')
    expect(crearAdmin).not.toHaveBeenCalled()
    expect(pedir).not.toHaveBeenCalled()
  })

  it('con la base en la nube, el loopback no se prueba', async () => {
    urlDeLaBase = 'https://abc.supabase.co'
    conDireccion('http://127.0.0.1:9/x')
    const resultado = await probarRevalidacion()
    expect(resultado.ok ? null : resultado.error.codigo).toBe('regla')
    expect(crearAdmin).not.toHaveBeenCalled()
    expect(pedir).not.toHaveBeenCalled()
  })

  it('manda el secreto sólo en la cabecera y devuelve sólo el código', async () => {
    const resultado = await probarRevalidacion()
    expect(resultado).toEqual({ ok: true, data: { codigo: 204, conHttps: true } })
    expect(JSON.stringify(resultado)).not.toContain(SECRETO)
    expect(llamadasDelAdmin).toEqual([['integracion_secreto', { p_clave: 'web_publica' }]])
    expect(pedir).toHaveBeenCalledTimes(1)
    const [direccion, opciones] = pedir.mock.calls[0] ?? []
    expect(direccion).toBe('https://sitio.com/api/revalidar')
    expect(opciones).toMatchObject({
      method: 'POST',
      body: '{"etiquetas":[]}',
      redirect: 'manual',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRETO}` },
    })
  })

  it('un loopback con la base local se prueba y avisa que no es https', async () => {
    conDireccion('http://127.0.0.1:4000/api/revalidar')
    const resultado = await probarRevalidacion()
    expect(resultado).toEqual({ ok: true, data: { codigo: 204, conHttps: false } })
  })

  it('si no responde, falla sin el error original ni el secreto', async () => {
    pedir.mockRejectedValue(new Error(`no conecta con Bearer ${SECRETO}`))
    const resultado = await probarRevalidacion()
    expect(resultado.ok ? null : resultado.error.codigo).toBe('regla')
    expect(JSON.stringify(resultado)).not.toContain(SECRETO)
  })
})
