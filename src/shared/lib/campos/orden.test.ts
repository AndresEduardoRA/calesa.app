import { describe, expect, it } from 'vitest'
import { destinoDeMovimiento } from './orden'

function campo(n: number, grupo: string | null = 'Vehículo', activo = true) {
  return { id: `c${String(n)}`, grupo, activo }
}

describe('destinoDeMovimiento', () => {
  const campos = [campo(1), campo(2), campo(3), campo(4, 'Venta')]

  it('bajar lo pone después de su vecino de grupo', () => {
    expect(destinoDeMovimiento(campos, 'c1', 'bajar')).toEqual({ despuesDe: 'c2' })
  })

  it('subir lo pone antes de su vecino: después del que estaba antes de él', () => {
    expect(destinoDeMovimiento(campos, 'c3', 'subir')).toEqual({ despuesDe: 'c1' })
  })

  it('subir al segundo lo deja primero de todo', () => {
    expect(destinoDeMovimiento(campos, 'c2', 'subir')).toEqual({ despuesDe: null })
  })

  it('no se sale de su grupo', () => {
    expect(destinoDeMovimiento(campos, 'c1', 'subir')).toBeNull()
    expect(destinoDeMovimiento(campos, 'c3', 'bajar')).toBeNull()
    expect(destinoDeMovimiento(campos, 'c4', 'subir')).toBeNull()
  })

  it('cuenta los desactivados al medir «antes de»', () => {
    const conInactivo = [campo(1, 'Vehículo', false), campo(2), campo(3)]
    expect(destinoDeMovimiento(conInactivo, 'c3', 'subir')).toEqual({ despuesDe: 'c1' })
  })

  it('un campo que no existe no se mueve', () => {
    expect(destinoDeMovimiento(campos, 'no-existe', 'subir')).toBeNull()
  })
})
