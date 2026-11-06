import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ConfirmarConUrl } from './confirmar-con-url'

// El carril B registra los `<Confirmar>` de la fórmula en su propio archivo, sin tocar el registro del A (4.20-2c).
afterEach(() => {
  vi.doUnmock('./confirmar-con-url-formula')
  vi.resetModules()
})

describe('CONFIRMAR_CON_URL', () => {
  it('suma, después de los del núcleo, los que registra la fórmula', async () => {
    const inventado: ConfirmarConUrl = { abre: 'src/inventado.ts', senal: 'PANEL_INVENTADO' }
    vi.resetModules()
    vi.doMock('./confirmar-con-url-formula', () => ({
      CONFIRMAR_CON_URL_DE_LA_FORMULA: { 'src/inventado.tsx': inventado },
    }))
    const { CONFIRMAR_CON_URL, CONFIRMAR_CON_URL_DEL_NUCLEO } = await import('./confirmar-con-url')
    expect(CONFIRMAR_CON_URL).toEqual({
      ...CONFIRMAR_CON_URL_DEL_NUCLEO,
      'src/inventado.tsx': inventado,
    })
    expect(Object.keys(CONFIRMAR_CON_URL_DEL_NUCLEO).length).toBeGreaterThan(0)
  })

  it('sin nada de la fórmula, es el núcleo', async () => {
    vi.resetModules()
    const { CONFIRMAR_CON_URL, CONFIRMAR_CON_URL_DEL_NUCLEO } = await import('./confirmar-con-url')
    expect(CONFIRMAR_CON_URL).toEqual(CONFIRMAR_CON_URL_DEL_NUCLEO)
  })
})
