import { describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import { guardarConLogo, type CambioDeLogo } from './guardar-con-logo'

const VIEJA = 'logos/vieja.png'
const NUEVA = 'logos/nueva.png'

function puertos(opciones: { subeBien?: boolean; guardaBien?: boolean } = {}) {
  const { subeBien = true, guardaBien = true } = opciones
  return {
    subir: vi.fn(() =>
      Promise.resolve(subeBien ? ok({ ruta: NUEVA }) : fallo('inesperado', 'No se pudo subir.')),
    ),
    guardar: vi.fn((_ruta: string | null | undefined) =>
      Promise.resolve(
        guardaBien ? ok({ actualizadoEn: 'v2' }) : fallo('conflicto', 'Otra persona lo cambió.'),
      ),
    ),
    descartar: vi.fn(() => Promise.resolve()),
  }
}

const nuevo: CambioDeLogo<string> = { tipo: 'nuevo', logo: 'archivo' }

describe('guardarConLogo', () => {
  it('sin cambio de logo no sube ni borra nada, y guarda sin tocar el logo', async () => {
    const dobles = puertos()
    const resultado = await guardarConLogo(dobles, {
      cambio: { tipo: 'igual' },
      rutaGuardada: VIEJA,
    })
    expect(dobles.subir).not.toHaveBeenCalled()
    expect(dobles.guardar).toHaveBeenCalledWith(undefined)
    expect(dobles.descartar).not.toHaveBeenCalled()
    expect(resultado).toEqual(ok({ actualizadoEn: 'v2', logoRuta: VIEJA }))
  })

  it('con logo nuevo: sube, guarda con esa ruta y descarta el anterior', async () => {
    const dobles = puertos()
    const resultado = await guardarConLogo(dobles, { cambio: nuevo, rutaGuardada: VIEJA })
    expect(dobles.guardar).toHaveBeenCalledWith(NUEVA)
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith(VIEJA)
    expect(resultado).toEqual(ok({ actualizadoEn: 'v2', logoRuta: NUEVA }))
  })

  it('si el logo no sube, la fila no se guarda', async () => {
    const dobles = puertos({ subeBien: false })
    const resultado = await guardarConLogo(dobles, { cambio: nuevo, rutaGuardada: VIEJA })
    expect(resultado.ok).toBe(false)
    expect(dobles.guardar).not.toHaveBeenCalled()
    expect(dobles.descartar).not.toHaveBeenCalled()
  })

  it('si la fila no se guarda, el logo recién subido se descarta y el anterior queda', async () => {
    const dobles = puertos({ guardaBien: false })
    const resultado = await guardarConLogo(dobles, { cambio: nuevo, rutaGuardada: VIEJA })
    expect(resultado).toEqual(fallo('conflicto', 'Otra persona lo cambió.'))
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith(NUEVA)
  })

  it('subir de nuevo el mismo logo no lo borra aunque la fila falle', async () => {
    const dobles = puertos({ guardaBien: false })
    await guardarConLogo(dobles, { cambio: nuevo, rutaGuardada: NUEVA })
    expect(dobles.descartar).not.toHaveBeenCalled()
  })

  it('quitar el logo guarda null y descarta el que estaba', async () => {
    const dobles = puertos()
    const resultado = await guardarConLogo(dobles, {
      cambio: { tipo: 'quitar' },
      rutaGuardada: VIEJA,
    })
    expect(dobles.guardar).toHaveBeenCalledWith(null)
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith(VIEJA)
    expect(resultado).toEqual(ok({ actualizadoEn: 'v2', logoRuta: null }))
  })
})
