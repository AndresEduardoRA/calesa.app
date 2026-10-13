import { describe, expect, it } from 'vitest'
import {
  MAXIMO_DE_VISTAS,
  esLaVistaActual,
  esquemaParamsDeVista,
  motivoParaNoGuardar,
  urlDeVista,
  vistasDesde,
  type VistaGuardada,
} from './vista'

const ID = '00000000-0000-0000-0000-00000000000a'

describe('vistasDesde', () => {
  it('las ordena por orden y nombre', () => {
    const vistas = vistasDesde([
      { id: ID, nombre: 'Zeta', params: {}, orden: 0 },
      { id: ID, nombre: 'Alfa', params: { fase: 'a' }, orden: 0 },
      { id: ID, nombre: 'Primera', params: {}, orden: -1 },
    ])
    expect(vistas.map((vista) => vista.nombre)).toEqual(['Primera', 'Alfa', 'Zeta'])
    expect(vistas[1]?.params).toEqual({ fase: 'a' })
  })

  it('unos parámetros ilegibles dejan la vista sin filtros en vez de tumbar la lista', () => {
    expect(vistasDesde([{ id: ID, nombre: 'Rota', params: ['x'], orden: 0 }])[0]?.params).toEqual(
      {},
    )
    expect(
      vistasDesde([{ id: ID, nombre: 'Rota', params: { fase: 3 }, orden: 0 }])[0]?.params,
    ).toEqual({})
  })
})

describe('esquemaParamsDeVista', () => {
  it('acota la cantidad y el largo', () => {
    expect(esquemaParamsDeVista.safeParse({ origen: ID, 'anio.min': '2015' }).success).toBe(true)
    expect(esquemaParamsDeVista.safeParse({ q: 'x'.repeat(301) }).success).toBe(false)
    const muchas = Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`c${String(i)}`, 'x']))
    expect(esquemaParamsDeVista.safeParse(muchas).success).toBe(false)
  })
})

describe('esLaVistaActual', () => {
  const vista: VistaGuardada = { id: ID, nombre: 'Automáticos', params: { origen: 'o', fase: 'a' } }

  it('compara sin importar el orden de los parámetros', () => {
    expect(esLaVistaActual(vista, { fase: 'a', origen: 'o' })).toBe(true)
    expect(esLaVistaActual(vista, { fase: 'b', origen: 'o' })).toBe(false)
    expect(esLaVistaActual(vista, { fase: 'a', origen: 'o', q: 'x' })).toBe(false)
  })
})

describe('urlDeVista', () => {
  it('arma la URL con los parámetros codificados y en orden estable', () => {
    expect(urlDeVista('/vehiculos', { q: 'a, b (c)', 'anio.min': '2015' })).toBe(
      '/vehiculos?anio.min=2015&q=a%2C+b+%28c%29',
    )
    expect(urlDeVista('/vehiculos', {})).toBe('/vehiculos')
  })
})

describe('motivoParaNoGuardar', () => {
  const llenas = Array.from({ length: MAXIMO_DE_VISTAS }, (_, i) => ({
    id: ID,
    nombre: `Vista ${String(i)}`,
    params: {},
  }))

  it('con lugar, o reemplazando una que ya existe, se puede', () => {
    expect(motivoParaNoGuardar(llenas.slice(1), 'Nueva')).toBeNull()
    expect(motivoParaNoGuardar(llenas, 'Vista 3')).toBeNull()
  })

  it('con el cupo lleno, una más no', () => {
    expect(motivoParaNoGuardar(llenas, 'Nueva')).toContain('20 vistas')
  })
})
