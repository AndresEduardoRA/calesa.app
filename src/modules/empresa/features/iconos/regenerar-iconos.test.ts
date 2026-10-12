import { describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import type { Iconos } from '../../entities/iconos'
import { guardarIconosRegenerados } from './regenerar-iconos'

function juego(prefijo: string): Iconos {
  return {
    '32': `iconos/${prefijo}-32.png`,
    '180': `iconos/${prefijo}-180.png`,
    '192': `iconos/${prefijo}-192.png`,
    '512': `iconos/${prefijo}-512.png`,
    '512m': `iconos/${prefijo}-512m.png`,
  }
}

const VIEJOS = juego('viejo')
const NUEVOS = juego('nuevo')

function puertos(opciones: { subeBien?: boolean; guardaBien?: boolean } = {}) {
  const { subeBien = true, guardaBien = true } = opciones
  return {
    subir: vi.fn(() =>
      Promise.resolve(subeBien ? ok(NUEVOS) : fallo('inesperado', 'No se pudieron subir.')),
    ),
    guardar: vi.fn((_iconos: Iconos | null) =>
      Promise.resolve(
        guardaBien ? ok({ actualizadoEn: 'v2' }) : fallo('conflicto', 'Otra persona lo cambió.'),
      ),
    ),
    descartar: vi.fn((_rutas: string[]) => Promise.resolve()),
  }
}

describe('guardarIconosRegenerados', () => {
  it('sube, guarda las rutas nuevas y descarta las anteriores', async () => {
    const dobles = puertos()
    const resultado = await guardarIconosRegenerados(dobles, { dibujados: 'x', anteriores: VIEJOS })
    expect(resultado).toEqual(ok({ actualizadoEn: 'v2' }))
    expect(dobles.guardar).toHaveBeenCalledWith(NUEVOS)
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith(Object.values(VIEJOS))
  })

  it('si no suben, no se guarda nada ni se borra nada', async () => {
    const dobles = puertos({ subeBien: false })
    const resultado = await guardarIconosRegenerados(dobles, { dibujados: 'x', anteriores: VIEJOS })
    expect(resultado.ok).toBe(false)
    expect(dobles.guardar).not.toHaveBeenCalled()
    expect(dobles.descartar).not.toHaveBeenCalled()
  })

  it('si la fila no se guarda, lo recién subido se descarta y lo anterior queda', async () => {
    const dobles = puertos({ guardaBien: false })
    const resultado = await guardarIconosRegenerados(dobles, { dibujados: 'x', anteriores: VIEJOS })
    expect(resultado.ok).toBe(false)
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith(Object.values(NUEVOS))
  })

  it('regenerar lo mismo no borra lo que sigue en uso', async () => {
    const dobles = puertos()
    await guardarIconosRegenerados(dobles, { dibujados: 'x', anteriores: NUEVOS })
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith([])
    const fallidos = puertos({ guardaBien: false })
    await guardarIconosRegenerados(fallidos, { dibujados: 'x', anteriores: NUEVOS })
    expect(fallidos.descartar).toHaveBeenCalledExactlyOnceWith([])
  })

  it('volver a los neutros guarda null, sin subir, y descarta los que había', async () => {
    const dobles = puertos()
    await guardarIconosRegenerados(dobles, { dibujados: null, anteriores: VIEJOS })
    expect(dobles.subir).not.toHaveBeenCalled()
    expect(dobles.guardar).toHaveBeenCalledWith(null)
    expect(dobles.descartar).toHaveBeenCalledExactlyOnceWith(Object.values(VIEJOS))
  })
})
