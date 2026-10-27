import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const ORIGEN = { id: '00000000-0000-0000-0000-0000000000aa', nombre: 'Corea', tipo: 'manual' }

vi.mock('@/modules/origenes', () => ({
  getOrigenes: vi.fn(() => Promise.resolve({ ok: true, data: [ORIGEN] })),
  leerLayout: vi.fn(() => Promise.resolve({ ok: true, data: { campos: [], categorias: [] } })),
}))
vi.mock('@/modules/empresa', () => ({
  getAjustes: vi.fn(() => Promise.resolve({ zonaHoraria: 'America/La_Paz', locale: 'en-US' })),
}))

const { fuentesDeValidacion } = await import('./fuentes')

// 4.13-3c: la action valida con el locale de la empresa, el mismo con que el formulario escribió los números.
describe('fuentesDeValidacion', () => {
  it('entrega la zona y el locale de los ajustes de la empresa', async () => {
    const leido = await fuentesDeValidacion(ORIGEN.id, null)
    expect(leido.ok && leido.data.fuentes).toMatchObject({
      zona: 'America/La_Paz',
      locale: 'en-US',
    })
  })
})
