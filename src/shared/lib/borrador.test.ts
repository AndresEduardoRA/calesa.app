import { describe, expect, it } from 'vitest'
import {
  borrarBorrador,
  cambiosDeEstado,
  cambiosDelBorrador,
  guardarBorrador,
  guardarBorradorDeEstado,
  leerBorrador,
  leerBorradorDeEstado,
} from './borrador'

function almacenDePrueba() {
  const datos = new Map<string, string>()
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
    removeItem: (clave: string) => void datos.delete(clave),
  }
}

describe('borrador', () => {
  it('guarda y recupera los valores de un formulario por su clave', () => {
    const almacen = almacenDePrueba()
    guardarBorrador(almacen, 'empresa', { nombre: 'Andina', nit: '123' })
    expect(leerBorrador(almacen, 'empresa')).toEqual({ nombre: 'Andina', nit: '123' })
    expect(leerBorrador(almacen, 'otro')).toBeNull()
  })

  it('después de borrarlo no queda nada', () => {
    const almacen = almacenDePrueba()
    guardarBorrador(almacen, 'empresa', { nombre: 'Andina' })
    borrarBorrador(almacen, 'empresa')
    expect(leerBorrador(almacen, 'empresa')).toBeNull()
  })

  it('un borrador ilegible o con otra forma es lo mismo que no tenerlo', () => {
    const almacen = almacenDePrueba()
    almacen.setItem('borrador:roto', '{no es json')
    almacen.setItem('borrador:lista', '["a"]')
    almacen.setItem('borrador:numeros', '{"dias": 3}')
    expect(leerBorrador(almacen, 'roto')).toBeNull()
    expect(leerBorrador(almacen, 'lista')).toBeNull()
    expect(leerBorrador(almacen, 'numeros')).toBeNull()
  })

  it('si el almacenamiento falla, el formulario sigue sin borrador', () => {
    const bloqueado = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
      removeItem: () => {
        throw new Error('bloqueado')
      },
    }
    expect(() => {
      guardarBorrador(bloqueado, 'empresa', { nombre: 'x' })
      borrarBorrador(bloqueado, 'empresa')
    }).not.toThrow()
    expect(leerBorrador(bloqueado, 'empresa')).toBeNull()
  })
})

describe('cambiosDelBorrador', () => {
  it('un espacio de más en los bordes no es un cambio', () => {
    expect(cambiosDelBorrador({ nombre: 'Andina ' }, { nombre: 'Andina' })).toEqual({})
  })

  it('deja sólo lo que difiere de lo guardado', () => {
    expect(
      cambiosDelBorrador(
        { nombre: 'Andina', nit: '', ciudad: 'La Paz' },
        { nombre: 'Mi importadora', ciudad: 'La Paz' },
      ),
    ).toEqual({ nombre: 'Andina' })
  })
})

describe('borrador de un formulario controlado', () => {
  it('se queda con lo que difiere de lo guardado, sea texto, número, sí o no o lista', () => {
    const guardado = { titulo: 'RAV4', anio: 2020, placado: false, extras: ['a'], nota: '' }
    expect(cambiosDeEstado(guardado, guardado)).toEqual({})
    expect(
      cambiosDeEstado({ ...guardado, titulo: 'RAV4 ', anio: 2021, extras: ['a', 'b'] }, guardado),
    ).toEqual({ anio: 2021, extras: ['a', 'b'] })
    expect(cambiosDeEstado({ ...guardado, placado: true, nota: 'x' }, guardado)).toEqual({
      placado: true,
      nota: 'x',
    })
  })

  it('guarda, recupera y se borra solo cuando ya no hay cambios', () => {
    const almacen = almacenDePrueba()
    guardarBorradorDeEstado(almacen, 'vehiculo-nuevo', { anio: 2021, extras: ['a'] })
    expect(leerBorradorDeEstado(almacen, 'vehiculo-nuevo')).toEqual({ anio: 2021, extras: ['a'] })
    guardarBorradorDeEstado(almacen, 'vehiculo-nuevo', {})
    expect(leerBorradorDeEstado(almacen, 'vehiculo-nuevo')).toBeNull()
  })

  it('uno ilegible es lo mismo que no tener', () => {
    const almacen = almacenDePrueba()
    almacen.setItem('borrador-estado:roto', '{no es json')
    expect(leerBorradorDeEstado(almacen, 'roto')).toBeNull()
    almacen.setItem('borrador-estado:lista', '[1,2]')
    expect(leerBorradorDeEstado(almacen, 'lista')).toBeNull()
  })
})
