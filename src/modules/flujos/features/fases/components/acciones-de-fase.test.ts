import { describe, expect, it, vi } from 'vitest'
import { accionesDeFase } from './acciones-de-fase'

const quehaceres = { alEditar: vi.fn(), alPedirQuitar: vi.fn(), alReactivar: vi.fn() }

describe('accionesDeFase', () => {
  it('una activa ofrece Editar y, aparte, Jubilar o eliminar como destructiva', () => {
    const lineas = accionesDeFase({ activa: true }, quehaceres)
    expect(lineas.map((l) => l.clave)).toEqual(['editar', 'antes-de-quitar', 'quitar'])
    const quitar = lineas.find((l) => l.clave === 'quitar')
    expect(quitar).toMatchObject({ etiqueta: 'Jubilar o eliminar', destructiva: true })
  })

  it('una jubilada ofrece Editar y Reactivar, nada que elimine', () => {
    const lineas = accionesDeFase({ activa: false }, quehaceres)
    expect(lineas.map((l) => l.clave)).toEqual(['editar', 'reactivar'])
  })

  it('cada línea llama a lo suyo', () => {
    for (const l of accionesDeFase({ activa: true }, quehaceres)) {
      if (l.tipo === 'accion') l.alElegir()
    }
    expect(quehaceres.alEditar).toHaveBeenCalledTimes(1)
    expect(quehaceres.alPedirQuitar).toHaveBeenCalledTimes(1)
    expect(quehaceres.alReactivar).not.toHaveBeenCalled()
  })
})
