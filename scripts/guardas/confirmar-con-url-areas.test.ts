import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ConfirmarConUrl } from './confirmar-con-url'
import { sumarObjetos } from './registros-de-carriles'

// Los `<Confirmar>` de la fórmula y de la papelera van en su propio archivo y se suman tras los del núcleo (4.20-2c). Las partes de
// `areas-*/confirmar-con-url.ts` (borrar un comentario, 4.27-2) se suma siempre al final.
const DE_LAS_AREAS = sumarObjetos<ConfirmarConUrl>(
  import.meta.glob('./areas-*/confirmar-con-url.ts', { eager: true }),
)
afterEach(() => {
  vi.doUnmock('./confirmar-con-url-formula')
  vi.doUnmock('./confirmar-con-url-papelera')
  vi.resetModules()
})

describe('CONFIRMAR_CON_URL', () => {
  it('suma, después de los del núcleo, los que registra la fórmula', async () => {
    const inventado: ConfirmarConUrl = { abre: 'src/inventado.ts', senal: 'PANEL_INVENTADO' }
    vi.resetModules()
    vi.doMock('./confirmar-con-url-formula', () => ({
      CONFIRMAR_CON_URL_DE_LA_FORMULA: { 'src/inventado.tsx': inventado },
    }))
    vi.doMock('./confirmar-con-url-papelera', () => ({ CONFIRMAR_CON_URL_DE_LA_PAPELERA: {} }))
    const { CONFIRMAR_CON_URL, CONFIRMAR_CON_URL_DEL_NUCLEO } = await import('./confirmar-con-url')
    expect(CONFIRMAR_CON_URL).toEqual({
      ...CONFIRMAR_CON_URL_DEL_NUCLEO,
      'src/inventado.tsx': inventado,
      ...DE_LAS_AREAS,
    })
    expect(Object.keys(CONFIRMAR_CON_URL_DEL_NUCLEO).length).toBeGreaterThan(0)
  })

  it('sin nada de la fórmula, es el núcleo', async () => {
    vi.resetModules()
    // El registro real de la fórmula no está vacío: se simula vacío.
    vi.doMock('./confirmar-con-url-formula', () => ({
      CONFIRMAR_CON_URL_DE_LA_FORMULA: {},
    }))
    vi.doMock('./confirmar-con-url-papelera', () => ({ CONFIRMAR_CON_URL_DE_LA_PAPELERA: {} }))
    const { CONFIRMAR_CON_URL, CONFIRMAR_CON_URL_DEL_NUCLEO } = await import('./confirmar-con-url')
    expect(CONFIRMAR_CON_URL).toEqual({ ...CONFIRMAR_CON_URL_DEL_NUCLEO, ...DE_LAS_AREAS })
  })

  it('suma, después de los del núcleo, los que registra la papelera', async () => {
    const inventado: ConfirmarConUrl = { abre: 'src/inventado.ts', senal: 'PANEL_INVENTADO' }
    vi.resetModules()
    vi.doMock('./confirmar-con-url-formula', () => ({ CONFIRMAR_CON_URL_DE_LA_FORMULA: {} }))
    vi.doMock('./confirmar-con-url-papelera', () => ({
      CONFIRMAR_CON_URL_DE_LA_PAPELERA: { 'src/inventado.tsx': inventado },
    }))
    const { CONFIRMAR_CON_URL, CONFIRMAR_CON_URL_DEL_NUCLEO } = await import('./confirmar-con-url')
    expect(CONFIRMAR_CON_URL).toEqual({
      ...CONFIRMAR_CON_URL_DEL_NUCLEO,
      'src/inventado.tsx': inventado,
      ...DE_LAS_AREAS,
    })
  })
})
