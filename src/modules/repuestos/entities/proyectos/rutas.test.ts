import { describe, expect, it } from 'vitest'
import { rutaDelProyecto } from './rutas'

describe('rutaDelProyecto', () => {
  it('cuelga del listado', () => {
    expect(rutaDelProyecto('abc')).toBe('/repuestos/abc')
  })
})
