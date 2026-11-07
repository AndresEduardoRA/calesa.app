import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RegistroDeDrawer } from './drawers-con-salida'

// El carril B registra los `<Drawer>` de la fórmula en su propio archivo, sin tocar el registro del A (4.20-3b).
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
    expect(DRAWERS).toEqual({ ...DRAWERS_DEL_NUCLEO, 'src/inventado.tsx': inventado })
    expect(Object.keys(DRAWERS_DEL_NUCLEO).length).toBeGreaterThan(0)
  })

  it('sin nada de la fórmula, es el núcleo', async () => {
    vi.resetModules()
    // El registro real de la fórmula deja de estar vacío en cuanto el B registra su panel: se simula vacío.
    vi.doMock('./drawers-con-salida-formula', () => ({ DRAWERS_DE_LA_FORMULA: {} }))
    const { DRAWERS, DRAWERS_DEL_NUCLEO } = await import('./drawers-con-salida')
    expect(DRAWERS).toEqual(DRAWERS_DEL_NUCLEO)
  })
})
