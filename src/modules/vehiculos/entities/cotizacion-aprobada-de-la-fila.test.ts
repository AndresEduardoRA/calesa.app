import { describe, expect, it } from 'vitest'
import { aprobadaDeLaFila, montoDeLaAprobada } from './cotizacion-aprobada-de-la-fila'

const V1 = '11111111-1111-4111-8111-111111111111'
const V2 = '22222222-2222-4222-8222-222222222222'

describe('aprobadaDeLaFila', () => {
  const aprobadas = { [V1]: { ruta: '/cotizaciones/x', monto: '1234.50', moneda: 'USD' } }

  it('la del vehículo, o nada si no hay (la celda dice «—»)', () => {
    expect(aprobadaDeLaFila(aprobadas, V1)).toEqual(aprobadas[V1])
    expect(aprobadaDeLaFila(aprobadas, V2)).toBeNull()
  })

  it('un id que es una propiedad del prototipo no es una aprobada', () => {
    expect(aprobadaDeLaFila(aprobadas, 'toString')).toBeNull()
    expect(aprobadaDeLaFila(aprobadas, '__proto__')).toBeNull()
  })
})

describe('montoDeLaAprobada', () => {
  const con = (monto: string | null) => ({ ruta: '/x', monto, moneda: 'USD' })

  it('el texto del numeric pasa a número para `<Monto>`', () => {
    expect(montoDeLaAprobada(con('1234.50'))).toBe(1234.5)
    expect(montoDeLaAprobada(con('0'))).toBe(0)
  })

  it('sin total (nulo o que no es un número) es nulo: la celda dice «Sin total»', () => {
    expect(montoDeLaAprobada(con(null))).toBeNull()
    expect(montoDeLaAprobada(con('no es un número'))).toBeNull()
  })
})
