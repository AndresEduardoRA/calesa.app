import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RpcPaginada } from './paginas-en-la-base'
import { sumarListas } from './registros-de-carriles'

// La RPC con tamaño de la papelera va en su propio archivo y se suma tras las del núcleo (4.15-7). Las partes de
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
    // El registro real de la papelera no está vacío (4.24-2): se simula vacío.
    vi.doMock('./paginas-en-la-base-papelera', () => ({ RPC_PAGINADAS_DE_LA_PAPELERA: [] }))
    const { RPC_PAGINADAS, RPC_PAGINADAS_DEL_NUCLEO } = await import('./paginas-en-la-base')
    expect(RPC_PAGINADAS).toEqual([...RPC_PAGINADAS_DEL_NUCLEO, ...DE_LAS_AREAS])
  })
})
