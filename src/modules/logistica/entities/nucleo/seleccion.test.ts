import { describe, expect, it } from 'vitest'
import {
  alternar,
  AVISO_DE_OTRA_FASE,
  columnaElegidaEntera,
  elegirLaColumna,
  idsElegidos,
  SELECCION_VACIA,
  TOPE_DE_LA_SELECCION,
  vaciar,
} from './seleccion'

const B = { id: 'fase-b', nombre: 'En puerto' }
const C = { id: 'fase-c', nombre: 'En aduana' }
const unidad = (n: number) => ({ id: `u${String(n)}`, nombre: `Unidad ${String(n)}` })

describe('selección de una sola fase', () => {
  it('elegir y quitar; quitar la última deja la selección sin fase', () => {
    const uno = alternar(SELECCION_VACIA, B, unidad(1))
    expect(uno.fase).toEqual(B)
    expect(idsElegidos(uno)).toEqual(['u1'])
    const ninguno = alternar(uno, B, unidad(1))
    expect(ninguno.fase).toBeNull()
    expect(ninguno.elegidos.size).toBe(0)
  })

  it('elegir en otra fase reemplaza lo anterior y lo avisa', () => {
    const en = elegirLaColumna(SELECCION_VACIA, B, [unidad(1), unidad(2)])
    const otra = alternar(en, C, unidad(9))
    expect(otra.fase).toEqual(C)
    expect(idsElegidos(otra)).toEqual(['u9'])
    expect(otra.aviso).toBe(AVISO_DE_OTRA_FASE)
    // Lo siguiente en la misma fase ya no repite el aviso.
    expect(alternar(otra, C, unidad(10)).aviso).toBeNull()
  })

  it('elegir la columna en otra fase también reemplaza y avisa', () => {
    const en = alternar(SELECCION_VACIA, B, unidad(1))
    const otra = elegirLaColumna(en, C, [unidad(5)])
    expect(idsElegidos(otra)).toEqual(['u5'])
    expect(otra.aviso).toBe(AVISO_DE_OTRA_FASE)
  })

  it('el tope es 200: elegir la columna recorta y lo dice; una más suelta no entra', () => {
    expect(TOPE_DE_LA_SELECCION).toBe(200)
    const muchas = Array.from({ length: 230 }, (_, i) => unidad(i))
    const estado = elegirLaColumna(SELECCION_VACIA, B, muchas)
    expect(estado.elegidos.size).toBe(200)
    expect(estado.recortada).toBe(true)
    const mas = alternar(estado, B, unidad(999))
    expect(mas.elegidos.size).toBe(200)
    expect(mas.aviso).toContain('200')
  })

  it('elegir la columna suma a lo ya elegido sin repetir', () => {
    const uno = alternar(SELECCION_VACIA, B, unidad(1))
    const todas = elegirLaColumna(uno, B, [unidad(1), unidad(2), unidad(3)])
    expect(idsElegidos(todas)).toEqual(['u1', 'u2', 'u3'])
    expect(columnaElegidaEntera(todas, B.id, ['u1', 'u2', 'u3'])).toBe(true)
    expect(columnaElegidaEntera(todas, B.id, ['u1', 'u4'])).toBe(false)
    expect(columnaElegidaEntera(todas, C.id, ['u1'])).toBe(false)
  })

  it('vaciar deja la selección sin nada', () => {
    expect(vaciar()).toBe(SELECCION_VACIA)
  })
})
