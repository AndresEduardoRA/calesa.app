import { describe, expect, it } from 'vitest'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../flujo'
import { chipsDeLaFila, descripcionDeSalida } from './vista-de-salidas'

const id = (n: number) => `${String(n).repeat(8)}-1111-4111-8111-111111111111`
const fase = (n: number, nombre: string, activa = true): FaseParaConfigurar =>
  ({ id: id(n), nombre, orden: n * 10, activa, color: `#00000${String(n)}` }) as FaseParaConfigurar
const salida = (n: number, a: number, accion: string | null) => ({
  id: `s${String(n)}`,
  deFaseId: id(1),
  aFaseId: id(a),
  accion,
  notaObligatoria: false,
})

const base = (...salidas: ReturnType<typeof salida>[]) =>
  ({
    fases: [
      fase(1, 'Compra'),
      fase(2, 'Puerto'),
      fase(3, 'Embarcado'),
      fase(4, 'Entrega'),
      fase(5, 'Vieja', false),
    ],
    transiciones: salidas,
  }) as FlujoParaConfigurar

describe('chipsDeLaFila', () => {
  it('un chip por salida, con el color del destino y la acción si la hay', () => {
    const f = base(salida(1, 2, 'Comprar'), salida(2, 3, null))
    expect(chipsDeLaFila(f, f.fases[0] as FaseParaConfigurar)).toEqual({
      chips: [
        { id: 's1', texto: '→ Puerto · Comprar', color: '#000002', jubilada: false },
        { id: 's2', texto: '→ Embarcado', color: '#000003', jubilada: false },
      ],
      resto: 0,
    })
  })

  it('con más de tres, los tres primeros y cuántas faltan', () => {
    const f = base(salida(1, 2, null), salida(2, 3, null), salida(3, 4, null), salida(4, 5, null))
    const { chips, resto } = chipsDeLaFila(f, f.fases[0] as FaseParaConfigurar)
    expect(chips).toHaveLength(3)
    expect(resto).toBe(1)
  })

  it('un destino jubilado se marca', () => {
    const f = base(salida(1, 5, null))
    expect(chipsDeLaFila(f, f.fases[0] as FaseParaConfigurar).chips[0]?.jubilada).toBe(true)
  })

  it('sin salidas, nada', () => {
    const f = base()
    expect(chipsDeLaFila(f, f.fases[0] as FaseParaConfigurar)).toEqual({ chips: [], resto: 0 })
  })
})

describe('descripcionDeSalida', () => {
  it('sin acción dice «Mover»', () => {
    expect(descripcionDeSalida(salida(1, 2, null), 'Puerto')).toBe('Mover → Puerto')
    expect(descripcionDeSalida(salida(1, 2, 'Embarcar'), 'Puerto')).toBe('Embarcar → Puerto')
  })
})
