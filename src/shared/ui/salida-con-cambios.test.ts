import { describe, expect, it, vi } from 'vitest'
import { anotarCambiosSinGuardar, salirSinPerder } from './salida-con-cambios'

describe('salirSinPerder', () => {
  it('sin nadie anotado, sale directo', () => {
    const salir = vi.fn()
    salirSinPerder(salir)
    expect(salir).toHaveBeenCalledTimes(1)
  })

  it('con un formulario anotado, le pregunta a él y no sale', () => {
    const pregunta = vi.fn()
    const borrar = anotarCambiosSinGuardar(pregunta)
    const salir = vi.fn()
    salirSinPerder(salir)
    expect(pregunta).toHaveBeenCalledWith(salir)
    expect(salir).not.toHaveBeenCalled()
    borrar()
    salirSinPerder(salir)
    expect(salir).toHaveBeenCalledTimes(1)
  })

  it('pregunta el de más arriba, y al borrarse vuelve a preguntar el de abajo', () => {
    const abajo = vi.fn()
    const arriba = vi.fn()
    const borrarAbajo = anotarCambiosSinGuardar(abajo)
    const borrarArriba = anotarCambiosSinGuardar(arriba)
    salirSinPerder(() => undefined)
    expect(arriba).toHaveBeenCalledTimes(1)
    expect(abajo).not.toHaveBeenCalled()
    borrarArriba()
    salirSinPerder(() => undefined)
    expect(abajo).toHaveBeenCalledTimes(1)
    borrarAbajo()
  })
})
