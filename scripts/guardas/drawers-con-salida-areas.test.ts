import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RegistroDeDrawer } from './drawers-con-salida'
import { sumarObjetos } from './registros-de-carriles'

// Los `<Drawer>` de la fórmula van en su propio archivo y se suman tras los del núcleo (4.20-3b). Las partes de
// `areas-*/drawers-con-salida.ts` (los paneles de la agenda, 7.07-2) se suma siempre al final.
const DE_LAS_AREAS = sumarObjetos<RegistroDeDrawer>(
  import.meta.glob('./areas-*/drawers-con-salida.ts', { eager: true }),
)
afterEach(() => {
  vi.doUnmock('./drawers-con-salida-formula')
  vi.resetModules()
})

describe('DRAWERS', () => {
  it('suma, después de los del núcleo, los que registra la fórmula', async () => {
    const inventado: RegistroDeDrawer = { sinFormulario: 'un panel inventado que no guarda nada' }
    vi.resetModules()
    vi.doMock('./drawers-con-salida-formula', () => ({
      DRAWERS_DE_LA_FORMULA: { 'src/inventado.tsx': inventado },
    }))
    const { DRAWERS, DRAWERS_DEL_NUCLEO } = await import('./drawers-con-salida')
    expect(DRAWERS).toEqual({
      ...DRAWERS_DEL_NUCLEO,
      'src/inventado.tsx': inventado,
      ...DE_LAS_AREAS,
    })
    expect(Object.keys(DRAWERS_DEL_NUCLEO).length).toBeGreaterThan(0)
  })

  it('sin nada de la fórmula, es el núcleo', async () => {
    vi.resetModules()
    // El registro real de la fórmula no está vacío: se simula vacío.
    vi.doMock('./drawers-con-salida-formula', () => ({ DRAWERS_DE_LA_FORMULA: {} }))
    const { DRAWERS, DRAWERS_DEL_NUCLEO } = await import('./drawers-con-salida')
    expect(DRAWERS).toEqual({ ...DRAWERS_DEL_NUCLEO, ...DE_LAS_AREAS })
  })
})
