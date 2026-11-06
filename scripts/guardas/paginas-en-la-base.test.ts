import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RpcPaginada } from './paginas-en-la-base'

// El carril C registra la RPC con tamaño de su papelera en su propio archivo, sin tocar el registro del A (4.15-7).
afterEach(() => {
  vi.doUnmock('./paginas-en-la-base-papelera')
  vi.resetModules()
})

describe('RPC_PAGINADAS', () => {
  it('suma, después de las del núcleo, las que registra la papelera', async () => {
    const inventada: RpcPaginada = {
      rpc: 'papelera_inventada',
      parametro: 'p_tamano',
      pideElCodigo: 20,
      lista: 'papelera inventada',
    }
    vi.resetModules()
    vi.doMock('./paginas-en-la-base-papelera', () => ({
      RPC_PAGINADAS_DE_LA_PAPELERA: [inventada],
    }))
    const { RPC_PAGINADAS, RPC_PAGINADAS_DEL_NUCLEO } = await import('./paginas-en-la-base')
    expect(RPC_PAGINADAS).toEqual([...RPC_PAGINADAS_DEL_NUCLEO, inventada])
    expect(RPC_PAGINADAS_DEL_NUCLEO.length).toBeGreaterThan(0)
  })

  it('sin nada de la papelera, es el núcleo', async () => {
    vi.resetModules()
    const { RPC_PAGINADAS, RPC_PAGINADAS_DEL_NUCLEO } = await import('./paginas-en-la-base')
    expect(RPC_PAGINADAS).toEqual(RPC_PAGINADAS_DEL_NUCLEO)
  })
})
