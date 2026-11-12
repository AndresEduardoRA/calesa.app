import { describe, expect, it } from 'vitest'
import { TOPE_DE_FASES } from '../flujo'
import {
  MOTIVO_DE_FASE_NO_DISPONIBLE,
  MOTIVO_DE_FASE_YA_JUBILADA,
  firmaDelOrdenDeFases,
  motivoParaNoAbrirNuevaFase,
  motivoParaNoQuitarFase,
} from './panel-de-fase'

type F = { id: string; activa: boolean }
const fase = (id: string, activa = true): F => ({ id, activa })
const flujoCon = (n: number) => ({
  fases: Array.from({ length: n }, (_, i) => fase(String(i))),
})

describe('motivoParaNoAbrirNuevaFase', () => {
  it('abre con espacio y no abre al tope', () => {
    expect(motivoParaNoAbrirNuevaFase(flujoCon(0))).toBeNull()
    expect(motivoParaNoAbrirNuevaFase(flujoCon(TOPE_DE_FASES - 1))).toBeNull()
    expect(motivoParaNoAbrirNuevaFase(flujoCon(TOPE_DE_FASES))).toMatch(/máximo/u)
  })
})

describe('motivoParaNoQuitarFase', () => {
  const flujo = { fases: [fase('a'), fase('b', false)] }

  it('abre para una fase activa del flujo', () => {
    expect(motivoParaNoQuitarFase(flujo, 'a')).toBeNull()
  })

  it('no abre sin id, con un id que no está ni con una jubilada', () => {
    expect(motivoParaNoQuitarFase(flujo, null)).toBe(MOTIVO_DE_FASE_NO_DISPONIBLE)
    expect(motivoParaNoQuitarFase(flujo, 'x')).toBe(MOTIVO_DE_FASE_NO_DISPONIBLE)
    expect(motivoParaNoQuitarFase(flujo, 'b')).toBe(MOTIVO_DE_FASE_YA_JUBILADA)
  })
})

describe('firmaDelOrdenDeFases', () => {
  it('cambia con el orden y no con el resto', () => {
    expect(firmaDelOrdenDeFases([{ id: 'a' }, { id: 'b' }])).not.toBe(
      firmaDelOrdenDeFases([{ id: 'b' }, { id: 'a' }]),
    )
    expect(firmaDelOrdenDeFases([{ id: 'a' }])).toBe(firmaDelOrdenDeFases([{ id: 'a' }]))
  })
})
