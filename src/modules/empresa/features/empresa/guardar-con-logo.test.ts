import { describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import { guardarConLogos, type CambioDeLogo, type RutasDeLogos } from './guardar-con-logo'

const VIEJA = 'logos/vieja.png'
const VIEJA_OSCURA = 'logos/vieja-oscura.png'

// El doble sube cada archivo a `logos/<archivo>.png`: el mismo archivo da la misma ruta (por hash).
function puertos(opciones: { noSube?: string; guardaBien?: boolean } = {}) {
  const { noSube, guardaBien = true } = opciones
  return {
    subir: vi.fn((logo: string) =>
      Promise.resolve(
        logo === noSube
          ? fallo('inesperado', 'No se pudo subir.')
          : ok({ ruta: `logos/${logo}.png` }),
      ),
    ),
    guardar: vi.fn((_rutas: RutasDeLogos) =>
      Promise.resolve(
        guardaBien ? ok({ actualizadoEn: 'v2' }) : fallo('conflicto', 'Otra persona lo cambió.'),
      ),
    ),
    descartar: vi.fn(() => Promise.resolve()),
  }
}

const igual: CambioDeLogo<string> = { tipo: 'igual' }
const quitar: CambioDeLogo<string> = { tipo: 'quitar' }
const nuevo = (logo: string): CambioDeLogo<string> => ({ tipo: 'nuevo', logo })

function pedido(claro: CambioDeLogo<string>, oscuro: CambioDeLogo<string>) {
  return {
    claro: { cambio: claro, rutaGuardada: VIEJA },
    oscuro: { cambio: oscuro, rutaGuardada: VIEJA_OSCURA },
  }
}

describe('guardarConLogos', () => {
  it('sin cambios de logo no sube ni borra nada, y guarda sin tocar ninguno', async () => {
    const dobles = puertos()
    const resultado = await guardarConLogos(dobles, pedido(igual, igual))
    expect(dobles.subir).not.toHaveBeenCalled()
    expect(dobles.guardar).toHaveBeenCalledExactlyOnceWith({
      logoRuta: undefined,
      logoOscuroRuta: undefined,
    })
    expect(dobles.descartar).not.toHaveBeenCalled()
    expect(resultado).toEqual(
      ok({ actualizadoEn: 'v2', logoRuta: VIEJA, logoOscuroRuta: VIEJA_OSCURA }),
    )
  })

  it('con los dos nuevos: sube los dos, guarda una sola vez con las dos rutas y descarta los anteriores', async () => {
    const dobles = puertos()
    const resultado = await guardarConLogos(dobles, pedido(nuevo('claro'), nuevo('oscuro')))
    expect(dobles.subir.mock.calls).toEqual([['claro'], ['oscuro']])
    expect(dobles.guardar).toHaveBeenCalledExactlyOnceWith({
      logoRuta: 'logos/claro.png',
      logoOscuroRuta: 'logos/oscuro.png',
    })
    expect(dobles.descartar.mock.calls).toEqual([[VIEJA], [VIEJA_OSCURA]])
    expect(resultado).toEqual(
      ok({ actualizadoEn: 'v2', logoRuta: 'logos/claro.png', logoOscuroRuta: 'logos/oscuro.png' }),
    )
  })

  it('si el segundo no sube, no se guarda nada y se descarta el primero ya subido', async () => {
    const dobles = puertos({ noSube: 'oscuro' })
    const resultado = await guardarConLogos(dobles, pedido(nuevo('claro'), nuevo('oscuro')))
    expect(resultado.ok).toBe(false)
    expect(dobles.guardar).not.toHaveBeenCalled()
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith('logos/claro.png')
  })

  it('si el segundo no sube, el primero que coincide con uno guardado no se descarta', async () => {
    const dobles = puertos({ noSube: 'oscuro' })
    await guardarConLogos(dobles, pedido(nuevo('vieja-oscura'), nuevo('oscuro')))
    expect(dobles.descartar).not.toHaveBeenCalled()
  })

  it('si la fila no se guarda, se descartan los recién subidos y ningún anterior', async () => {
    const dobles = puertos({ guardaBien: false })
    const resultado = await guardarConLogos(dobles, pedido(nuevo('claro'), nuevo('oscuro')))
    expect(resultado).toEqual(fallo('conflicto', 'Otra persona lo cambió.'))
    expect(dobles.descartar.mock.calls).toEqual([['logos/claro.png'], ['logos/oscuro.png']])
  })

  it('subir de nuevo un logo ya guardado no lo borra aunque la fila falle', async () => {
    const dobles = puertos({ guardaBien: false })
    await guardarConLogos(dobles, pedido(nuevo('vieja'), igual))
    expect(dobles.descartar).not.toHaveBeenCalled()
  })

  it('el mismo archivo en los dos espacios se sube y se descarta una sola vez', async () => {
    const dobles = puertos({ guardaBien: false })
    await guardarConLogos(dobles, pedido(nuevo('mismo'), nuevo('mismo')))
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith('logos/mismo.png')
  })

  it('un anterior que pasa a ser el logo del otro espacio no se descarta', async () => {
    const dobles = puertos()
    // El oscuro de antes pasa a ser el normal; el normal de antes queda huérfano.
    const resultado = await guardarConLogos(dobles, pedido(nuevo('vieja-oscura'), quitar))
    expect(dobles.guardar).toHaveBeenCalledExactlyOnceWith({
      logoRuta: VIEJA_OSCURA,
      logoOscuroRuta: null,
    })
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith(VIEJA)
    expect(resultado).toEqual(
      ok({ actualizadoEn: 'v2', logoRuta: VIEJA_OSCURA, logoOscuroRuta: null }),
    )
  })

  it('quitar el oscuro guarda null y descarta el que estaba, sin tocar el normal', async () => {
    const dobles = puertos()
    const resultado = await guardarConLogos(dobles, pedido(igual, quitar))
    expect(dobles.guardar).toHaveBeenCalledExactlyOnceWith({
      logoRuta: undefined,
      logoOscuroRuta: null,
    })
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith(VIEJA_OSCURA)
    expect(resultado).toEqual(ok({ actualizadoEn: 'v2', logoRuta: VIEJA, logoOscuroRuta: null }))
  })
})
