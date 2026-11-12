// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const crearConToken = vi.fn((_url: string, _clave: string, opciones: unknown) => ({ opciones }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, clave: string, opciones: unknown) =>
    crearConToken(url, clave, opciones),
}))
vi.mock('@/shared/config/entorno', () => ({
  entornoPublico: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.test',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'clave-publica',
  }),
}))
const getSession = vi.fn()
const getClaims = vi.fn()
const refreshSession = vi.fn()
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getSession, getClaims, refreshSession } }),
}))

import { prepararSesion } from './cliente-del-flujo'

const AHORA = 1_800_000_000_000
const enSegundos = (ms: number) => Math.floor((AHORA + ms) / 1000)
const sesion = (token: string) => ({ data: { session: { access_token: token } }, error: null })
const claims = (sub: string | undefined, exp: number) => ({
  data: { claims: { sub, exp } },
  error: null,
})

// El token que usa el cliente del flujo: lo que devuelve su `accessToken()`.
async function tokenDelCliente(llamada = 0): Promise<string> {
  const opciones = crearConToken.mock.calls[llamada]?.[2] as { accessToken: () => Promise<string> }
  return opciones.accessToken()
}

beforeEach(() => {
  getSession.mockResolvedValue(sesion('token-viejo'))
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('prepararSesion (T9)', () => {
  it('con una hora por delante, no renueva y el cliente lleva el mismo token que verificó getClaims', async () => {
    getClaims.mockResolvedValue(claims('u1', enSegundos(3600_000)))
    const preparada = await prepararSesion(AHORA)
    expect(preparada).toEqual({
      ok: true,
      data: { cliente: expect.anything() as unknown, venceEn: enSegundos(3600_000) },
    })
    expect(refreshSession).not.toHaveBeenCalled()
    expect(getClaims).toHaveBeenCalledWith('token-viejo')
    expect(await tokenDelCliente()).toBe('token-viejo')
  })

  it('con 2 minutos, renueva dentro del pedido y usa el token nuevo, verificado', async () => {
    getClaims
      .mockResolvedValueOnce(claims('u1', enSegundos(120_000)))
      .mockResolvedValueOnce(claims('u1', enSegundos(3600_000)))
    refreshSession.mockResolvedValue(sesion('token-nuevo'))
    const preparada = await prepararSesion(AHORA)
    expect(preparada.ok && preparada.data.venceEn).toBe(enSegundos(3600_000))
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(getClaims).toHaveBeenLastCalledWith('token-nuevo')
    expect(await tokenDelCliente()).toBe('token-nuevo')
  })

  it.each([
    [
      'sin sesión guardada',
      () => getSession.mockResolvedValue({ data: { session: null }, error: null }),
    ],
    [
      'un token que getClaims no verifica',
      () => getClaims.mockResolvedValue({ data: null, error: new Error('firma') }),
    ],
    ['claims sin sub', () => getClaims.mockResolvedValue(claims(undefined, enSegundos(3600_000)))],
    [
      'la renovación que falla',
      () => {
        getClaims.mockResolvedValue(claims('u1', enSegundos(60_000)))
        refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('reuso') })
      },
    ],
  ])('%s: no_autenticado y ningún cliente', async (_caso, preparar) => {
    getClaims.mockResolvedValue(claims('u1', enSegundos(3600_000)))
    preparar()
    const preparada = await prepararSesion(AHORA)
    expect(preparada.ok ? null : preparada.error.codigo).toBe('no_autenticado')
    expect(crearConToken).not.toHaveBeenCalled()
  })
})
