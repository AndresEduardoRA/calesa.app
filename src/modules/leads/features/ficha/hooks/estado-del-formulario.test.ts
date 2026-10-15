import { describe, expect, it } from 'vitest'
import { conCambio, conMotivos, enEspera, limpio, trasRechazo } from './estado-del-formulario'

describe('estado de la edición de la ficha', () => {
  const inicio = limpio({ nombre: 'Ana', 'atributos.ciudad': 'La Paz' })

  it('arranca limpio', () => {
    expect(inicio).toMatchObject({ errores: {}, conflicto: null, aviso: null, pendiente: null })
  })

  it('escribir resuelve el error de ese campo y limpia el aviso', () => {
    const con = { ...inicio, errores: { nombre: 'x', 'atributos.ciudad': 'y' }, aviso: 'algo' }
    const despues = conCambio(con, 'nombre', 'Berta')
    expect(despues.valores['nombre']).toBe('Berta')
    expect(despues.errores).toEqual({ 'atributos.ciudad': 'y' })
    expect(despues.aviso).toBeNull()
  })

  it('los motivos de la validación van junto a sus campos', () => {
    const despues = conMotivos({ ...inicio, conflicto: 'viejo' }, { nombre: 'Escribe el nombre.' })
    expect(despues.errores).toEqual({ nombre: 'Escribe el nombre.' })
    expect(despues.conflicto).toBeNull()
  })

  it('sin red queda esperando y conserva lo escrito', () => {
    const escrito = conCambio(inicio, 'nombre', 'Berta')
    const despues = enEspera(escrito)
    expect(despues.pendiente).toBe(true)
    expect(despues.valores['nombre']).toBe('Berta')
  })

  it('un conflicto conserva lo tipeado y no se repite arriba', () => {
    const escrito = conCambio({ ...inicio, pendiente: true }, 'nombre', 'Berta')
    const despues = trasRechazo(escrito, {
      codigo: 'conflicto',
      mensaje: 'Rosa Mamani cambió este lead hace 3 min.',
    })
    expect(despues.conflicto).toBe('Rosa Mamani cambió este lead hace 3 min.')
    expect(despues.aviso).toBeNull()
    expect(despues.pendiente).toBeNull()
    expect(despues.valores['nombre']).toBe('Berta')
  })

  it('un rechazo con campo no repite el mensaje arriba; sin campo sí', () => {
    const error = { codigo: 'validacion', mensaje: 'Falta «Ocupación».' } as const
    expect(trasRechazo(inicio, error, { 'atributos.ocupacion': error.mensaje }).aviso).toBeNull()
    expect(trasRechazo(inicio, error).aviso).toBe('Falta «Ocupación».')
  })
})
