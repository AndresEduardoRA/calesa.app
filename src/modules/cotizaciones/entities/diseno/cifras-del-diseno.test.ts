import { describe, expect, it } from 'vitest'
import { cifrasDelDiseno } from './cifras-del-diseno'
import { formulaDePrueba } from './diseno-de-prueba.soporte'

const params = { tasa: 0.1, tablas: {} }
// La de prueba compartida no valida sola (su total no tiene bucket): se le da uno, con un tipo de cambio que la vista previa no conoce.
const conVariante = (porDefecto: string | undefined) => ({
  nodos: [
    ...formulaDePrueba.nodos.map((n) =>
      n.tipo === 'opcion'
        ? { ...n, por_defecto: porDefecto }
        : n.id === 'total'
          ? { ...n, bucket: 'b' }
          : n,
    ),
    { id: 'tc', tipo: 'tipo_cambio', etiqueta: 'TC', clave: 'oficial' },
  ],
  buckets: { b: 'tc' },
})

describe('cifrasDelDiseno', () => {
  it('T2 · con la fórmula de tres sumandos da valores, estados y la suma en 0', () => {
    const r = cifrasDelDiseno(conVariante('x'), params)
    expect(r).not.toBeNull()
    expect(r?.totales.sumaUsd).toBe(0)
    expect(r?.valores.get('total')).toBe(0)
    expect(r?.estados.get('a')).toBe('activo')
    expect(r?.hayFaltantesOcultos).toBe(false)
  })

  it('T2 · con una definición que no valida da nulo y no lanza', () => {
    expect(cifrasDelDiseno({ nodos: 'no' }, params)).toBeNull()
    expect(cifrasDelDiseno(conVariante('x'), { tablas: {} })).toBeNull()
  })

  it('T2 · con una variante sin opción por defecto da nulo y no lanza', () => {
    expect(() => cifrasDelDiseno(conVariante(undefined), params)).not.toThrow()
    expect(cifrasDelDiseno(conVariante(undefined), params)).toBeNull()
  })
})
