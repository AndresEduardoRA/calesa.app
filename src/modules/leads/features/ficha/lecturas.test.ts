import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const leerFicha = vi.fn()
const leerLayoutDeLeads = vi.fn()
const leerOrigenesDeLead = vi.fn()
const leerEtiquetas = vi.fn()
const leerCartera = vi.fn()

vi.mock('../../composicion', () => ({
  leerFicha,
  leerLayoutDeLeads,
  leerOrigenesDeLead,
  leerEtiquetas,
  leerCartera,
}))

const { leerFichaDeLead } = await import('./lecturas')

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const ok = <T>(data: T) => ({ ok: true as const, data })
const error = { ok: false as const, error: { codigo: 'inesperado' as const, mensaje: 'Falló.' } }

describe('leerFichaDeLead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    leerLayoutDeLeads.mockResolvedValue(ok([]))
    leerOrigenesDeLead.mockResolvedValue(ok([]))
    leerEtiquetas.mockResolvedValue(ok([]))
    leerCartera.mockResolvedValue(ok([]))
  })

  it('abrir la ficha son exactamente cinco lecturas, en paralelo', async () => {
    leerFicha.mockResolvedValue(ok({ id: ID }))
    await leerFichaDeLead(ID)
    expect(leerFicha).toHaveBeenCalledTimes(1)
    expect(leerFicha).toHaveBeenCalledWith(ID)
    expect(leerLayoutDeLeads).toHaveBeenCalledTimes(1)
    expect(leerOrigenesDeLead).toHaveBeenCalledTimes(1)
    expect(leerEtiquetas).toHaveBeenCalledTimes(1)
    expect(leerCartera).toHaveBeenCalledWith(ID)
  })

  it('devuelve la ficha con el layout, los orígenes, las etiquetas de quien mira y quién lo tiene', async () => {
    leerFicha.mockResolvedValue(ok({ id: ID }))
    leerLayoutDeLeads.mockResolvedValue(ok([{ clave: 'ciudad' }]))
    leerOrigenesDeLead.mockResolvedValue(ok([{ id: 'o' }]))
    leerEtiquetas.mockResolvedValue(ok([{ id: 'e' }]))
    leerCartera.mockResolvedValue(ok([{ usuarioId: 'u' }]))
    const resultado = await leerFichaDeLead(ID)
    expect(resultado).toEqual(
      ok({
        ficha: { id: ID },
        campos: [{ clave: 'ciudad' }],
        origenes: [{ id: 'o' }],
        etiquetas: [{ id: 'e' }],
        cartera: [{ usuarioId: 'u' }],
      }),
    )
  })

  it('un lead que no se ve es null, sin distinguir por qué', async () => {
    leerFicha.mockResolvedValue(ok(null))
    expect(await leerFichaDeLead(ID)).toEqual(ok(null))
  })

  it('el error de cualquiera de las lecturas sube como error', async () => {
    leerFicha.mockResolvedValue(error)
    expect((await leerFichaDeLead(ID)).ok).toBe(false)
    leerFicha.mockResolvedValue(ok({ id: ID }))
    leerLayoutDeLeads.mockResolvedValue(error)
    expect((await leerFichaDeLead(ID)).ok).toBe(false)
    leerLayoutDeLeads.mockResolvedValue(ok([]))
    leerOrigenesDeLead.mockResolvedValue(error)
    expect((await leerFichaDeLead(ID)).ok).toBe(false)
    leerOrigenesDeLead.mockResolvedValue(ok([]))
    leerEtiquetas.mockResolvedValue(error)
    expect((await leerFichaDeLead(ID)).ok).toBe(false)
  })
})
