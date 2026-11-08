import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RpcPaginada } from './paginas-en-la-base'
import { sumarListas } from './registros-de-carriles'

// El carril C registra la RPC con tamaño de su papelera en su propio archivo, sin tocar el registro del A (4.15-7). Lo de los carriles en
// `areas-*/paginas-en-la-base.ts` (los comentarios, 4.27-2) va al final, tras la papelera.
const DE_LAS_AREAS = sumarListas<RpcPaginada>(
  import.meta.glob('./areas-*/paginas-en-la-base.ts', { eager: true }),
)

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
    expect(RPC_PAGINADAS).toEqual([...RPC_PAGINADAS_DEL_NUCLEO, inventada, ...DE_LAS_AREAS])
    expect(RPC_PAGINADAS_DEL_NUCLEO.length).toBeGreaterThan(0)
  })

  it('sin nada de la papelera, es el núcleo', async () => {
    vi.resetModules()
    // El registro real de la papelera deja de estar vacío en cuanto el C registra su RPC (4.24-2): se simula vacío.
    vi.doMock('./paginas-en-la-base-papelera', () => ({ RPC_PAGINADAS_DE_LA_PAPELERA: [] }))
    const { RPC_PAGINADAS, RPC_PAGINADAS_DEL_NUCLEO } = await import('./paginas-en-la-base')
    expect(RPC_PAGINADAS).toEqual([...RPC_PAGINADAS_DEL_NUCLEO, ...DE_LAS_AREAS])
  })
})
