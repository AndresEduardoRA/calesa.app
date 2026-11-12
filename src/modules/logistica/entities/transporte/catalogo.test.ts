import { describe, expect, it } from 'vitest'
import {
  borradorDePuerto,
  BORRADOR_NUEVO_DE_PUERTO,
  cambiosDeNaviera,
  cambiosDePuerto,
  navierasDesde,
  ordenarPuertos,
  puertosDesde,
  textoDeErrorDeCatalogo,
  usoDelPuerto,
  validarNaviera,
  validarPuerto,
  type BorradorDePuerto,
  type PuertoDeCatalogo,
} from './catalogo'

const ID = '5f0d0b0e-6a39-4f0e-9a39-0b6f9a1c2d3e'

const borrador = (p: Partial<BorradorDePuerto> = {}): BorradorDePuerto => ({
  ...BORRADOR_NUEVO_DE_PUERTO,
  nombre: 'San Antonio',
  ...p,
})

const puerto = (p: Partial<PuertoDeCatalogo> = {}): PuertoDeCatalogo => ({
  id: ID,
  nombre: 'San Antonio',
  pais: 'Chile',
  codigo: 'CLSAI',
  activo: true,
  orden: 0,
  ...p,
})

const errores = (b: BorradorDePuerto) => {
  const r = validarPuerto(b)
  return r.ok ? {} : r.errores
}

describe('validarPuerto', () => {
  it('rechaza un nombre vacío o de 81 caracteres y acepta uno de 80', () => {
    expect(errores(borrador({ nombre: '   ' }))['nombre']).toBe('Escribe el nombre.')
    expect(errores(borrador({ nombre: 'a'.repeat(81) }))['nombre']).toContain('80')
    expect(validarPuerto(borrador({ nombre: 'a'.repeat(80) })).ok).toBe(true)
  })

  it('recorta y colapsa los espacios del nombre y del país', () => {
    const r = validarPuerto(borrador({ nombre: '  Puerto   de  Arica ', pais: ' Chile  ' }))
    expect(r.ok && r.datos.nombre).toBe('Puerto de Arica')
    expect(r.ok && r.datos.pais).toBe('Chile')
  })

  it('guarda el código en mayúsculas y sin espacios, y vacío es sin código', () => {
    const r = validarPuerto(borrador({ codigo: ' cl sai ' }))
    expect(r.ok && r.datos.codigo).toBe('CLSAI')
    const vacio = validarPuerto(borrador({ codigo: '  ', pais: '' }))
    expect(vacio.ok && vacio.datos.codigo).toBeNull()
    expect(vacio.ok && vacio.datos.pais).toBeNull()
    expect(errores(borrador({ codigo: 'x'.repeat(13) }))['codigo']).toContain('12')
  })

  it('el orden es un entero de 0 a 32.767; vacío es 0', () => {
    expect(validarPuerto(borrador({ orden: '' })).ok).toBe(true)
    expect(validarPuerto(borrador({ orden: '32767' })).ok).toBe(true)
    for (const malo of ['32768', '-1', '1,5', 'a']) {
      expect(errores(borrador({ orden: malo }))['orden']).toContain('32767')
    }
  })

  it('un país de más de 60 letras se rechaza', () => {
    expect(errores(borrador({ pais: 'p'.repeat(61) }))['pais']).toContain('60')
  })
})

describe('validarNaviera', () => {
  it('normaliza el nombre y rechaza uno vacío o largo', () => {
    const r = validarNaviera({ nombre: '  Hapag   Lloyd ', activo: true })
    expect(r.ok && r.datos.nombre).toBe('Hapag Lloyd')
    expect(validarNaviera({ nombre: '', activo: true }).ok).toBe(false)
    expect(validarNaviera({ nombre: 'n'.repeat(81), activo: true }).ok).toBe(false)
  })
})

describe('cambiosDePuerto y cambiosDeNaviera', () => {
  it('mandan sólo lo que cambió y nada si no hay diferencia', () => {
    const original = puerto()
    const datos = { nombre: 'San Antonio', pais: 'Chile', codigo: 'CLSAI', activo: true, orden: 0 }
    expect(cambiosDePuerto(original, datos)).toBeNull()
    expect(cambiosDePuerto(original, { ...datos, activo: false, orden: 3 })).toEqual({
      activo: false,
      orden: 3,
    })
    expect(cambiosDePuerto(original, { ...datos, codigo: null })).toEqual({ codigo: null })
    const naviera = { id: ID, nombre: 'Maersk', activo: true }
    expect(cambiosDeNaviera(naviera, { nombre: 'Maersk', activo: true })).toBeNull()
    expect(cambiosDeNaviera(naviera, { nombre: 'Maersk', activo: false })).toEqual({
      activo: false,
    })
  })

  it('borradorDePuerto devuelve el formulario de lo guardado', () => {
    expect(borradorDePuerto(puerto({ pais: null, codigo: null, orden: 4 }))).toEqual({
      nombre: 'San Antonio',
      pais: '',
      codigo: '',
      orden: '4',
      activo: true,
    })
  })
})

describe('textoDeErrorDeCatalogo', () => {
  it('dice el repetido de cada tipo junto al nombre', () => {
    expect(textoDeErrorDeCatalogo('23505', { tipo: 'naviera', nombre: 'Maersk' })).toBe(
      'Ya existe una naviera llamada «Maersk».',
    )
    expect(
      textoDeErrorDeCatalogo('23505', { tipo: 'puerto', nombre: 'Arica', pais: 'Chile' }),
    ).toBe('Ya existe un puerto «Arica» en Chile.')
    expect(textoDeErrorDeCatalogo('23505', { tipo: 'puerto', nombre: 'Arica', pais: null })).toBe(
      'Ya existe un puerto llamado «Arica» sin país.',
    )
  })

  it('42501 es sin permiso y otro código no se anticipa', () => {
    const r = { tipo: 'naviera', nombre: 'X' } as const
    expect(textoDeErrorDeCatalogo('42501', r)).toBe(
      'No tienes permiso para cambiar los catálogos de transporte.',
    )
    expect(textoDeErrorDeCatalogo('23503', r)).toBeNull()
  })
})

describe('usoDelPuerto', () => {
  it('junta país y código, sólo lo que tenga, y dice «Sin país» si no hay nada', () => {
    expect(usoDelPuerto({ pais: 'Chile', codigo: 'CLSAI' })).toBe('Chile · CLSAI')
    expect(usoDelPuerto({ pais: 'Chile', codigo: null })).toBe('Chile')
    expect(usoDelPuerto({ pais: null, codigo: 'CLSAI' })).toBe('CLSAI')
    expect(usoDelPuerto({ pais: null, codigo: null })).toBe('Sin país')
  })
})

describe('lectura de filas y orden', () => {
  it('puertosDesde y navierasDesde dan nulo si una fila no tiene la forma', () => {
    expect(puertosDesde([puerto()])).toHaveLength(1)
    expect(puertosDesde([{ id: ID }])).toBeNull()
    expect(navierasDesde([{ id: ID, nombre: 'M', activo: true }])).toHaveLength(1)
    expect(navierasDesde([{ id: 'x', nombre: 'M', activo: true }])).toBeNull()
  })

  it('los puertos van por orden y luego por nombre', () => {
    const lista = ordenarPuertos([
      puerto({ id: 'b', nombre: 'Zárate', orden: 0 }),
      puerto({ id: 'a', nombre: 'Árica', orden: 0 }),
      puerto({ id: 'c', nombre: 'Aaa', orden: 5 }),
    ])
    expect(lista.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
})
