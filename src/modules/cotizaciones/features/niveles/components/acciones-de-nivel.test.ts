import { describe, expect, it, vi } from 'vitest'
import type { NivelDeAcceso } from '../../../entities/nivel'
import { menuDeNivel } from './acciones-de-nivel'

const base: NivelDeAcceso = {
  id: '00000000-0000-0000-0000-000000000001',
  clave: 'gerencia',
  nombre: 'Gerencia',
  retiradoEn: null,
  actualizadoEn: '2026-10-24T10:00:00Z',
  seRenombra: true,
  seRetira: true,
  seElimina: true,
  motivoDeUso: null,
}

function quehaceres() {
  return {
    alRenombrar: vi.fn(),
    alRetirar: vi.fn(),
    alRestaurar: vi.fn(),
    alPedirEliminar: vi.fn(),
  }
}

const claves = (lineas: ReturnType<typeof menuDeNivel>) => lineas.map((l) => l.clave)

describe('menuDeNivel', () => {
  it('un nivel común: Renombrar · Retirar · ─ · Eliminar', () => {
    expect(claves(menuDeNivel(base, quehaceres()))).toEqual([
      'renombrar',
      'retirar',
      'antes-de-eliminar',
      'eliminar',
    ])
  })

  it('cada línea llama a lo suyo con el nivel', () => {
    const q = quehaceres()
    for (const linea of menuDeNivel(base, q)) {
      if (linea.tipo === 'accion') {
        linea.alElegir()
      }
    }
    expect(q.alRenombrar).toHaveBeenCalledWith(base.id)
    expect(q.alRetirar).toHaveBeenCalledWith(base)
    expect(q.alPedirEliminar).toHaveBeenCalledWith(base.id)
    expect(q.alRestaurar).not.toHaveBeenCalled()
  })

  it('un retirado ofrece Restaurar y no Retirar', () => {
    const q = quehaceres()
    const lineas = menuDeNivel({ ...base, retiradoEn: '2026-10-24T11:00:00Z' }, q)
    expect(claves(lineas)).toEqual(['renombrar', 'restaurar', 'antes-de-eliminar', 'eliminar'])
    const restaurar = lineas.find((l) => l.clave === 'restaurar')
    if (restaurar?.tipo === 'accion') restaurar.alElegir()
    expect(q.alRestaurar).toHaveBeenCalled()
  })

  it('en uso: Eliminar apagado con el motivo de la base debajo, y Retirar en la línea de arriba', () => {
    const motivo = 'Está en 6 celdas de 2 orígenes: no se elimina. Puedes retirarlo.'
    const lineas = menuDeNivel({ ...base, motivoDeUso: motivo, seElimina: false }, quehaceres())
    expect(claves(lineas)).toEqual([
      'renombrar',
      'retirar',
      'antes-de-eliminar',
      'eliminar',
      'motivo-de-eliminar',
    ])
    const eliminar = lineas.find((l) => l.clave === 'eliminar')
    expect(eliminar).toMatchObject({ tipo: 'accion', deshabilitada: true, destructiva: true })
    expect(lineas.find((l) => l.clave === 'motivo-de-eliminar')).toMatchObject({ texto: motivo })
  })

  it('lo que abre algo encima espera a que el menú se cierre; retirar y restaurar no', () => {
    const lineas = menuDeNivel(base, quehaceres())
    const espera = (clave: string) => {
      const linea = lineas.find((l) => l.clave === clave)
      return linea?.tipo === 'accion' ? linea.despuesDeCerrar === true : null
    }
    expect(espera('renombrar')).toBe(true)
    expect(espera('eliminar')).toBe(true)
    expect(espera('retirar')).toBe(false)
  })

  it('el fijo no tiene menú', () => {
    expect(
      menuDeNivel({ ...base, seRenombra: false, seRetira: false, seElimina: false }, quehaceres()),
    ).toEqual([])
  })
})
