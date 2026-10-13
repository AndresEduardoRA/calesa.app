import { describe, expect, it } from 'vitest'
import {
  huellaDelOrigen,
  motivoParaNoEliminar,
  origenesConUsoDesde,
  origenesDesde,
  type OrigenConUso,
} from './origen'

const ID = '00000000-0000-0000-0000-00000000000a'

describe('origenesDesde', () => {
  it('se queda con lo que hace falta para nombrar y elegir un origen', () => {
    const filas = [{ id: ID, nombre: 'Oficina', color: '#027a48', activo: true, tipo: 'manual' }]
    expect(origenesDesde(filas)).toEqual([
      { id: ID, nombre: 'Oficina', color: '#027a48', activo: true },
    ])
  })

  it('sin orígenes devuelve una lista vacía', () => {
    expect(origenesDesde([])).toEqual([])
  })

  it('rechaza una fila sin nombre en vez de inventarlo', () => {
    expect(() => origenesDesde([{ id: ID, color: '#027a48', activo: true }])).toThrow()
  })
})

const FILA = {
  id: ID,
  clave: 'corea',
  nombre: 'Corea',
  sustantivo: 'unidad',
  genero: 'f',
  tipo: 'manual',
  color: '#027a48',
  activo: true,
  apibara_plataformas: [],
  actualizado_en: '2026-10-12T20:00:00+00:00',
}

describe('origenesConUsoDesde', () => {
  it('une cada origen con su uso por id', () => {
    const usos = [
      {
        origen_id: ID,
        vehiculos: 12,
        cotizaciones: 3,
        campos_activos: 8,
        categorias: 2,
        fases: 5,
        formula_publicada: true,
        concesiones: 4,
      },
    ]
    const [origen] = origenesConUsoDesde([FILA], usos)
    expect(origen?.nombre).toBe('Corea')
    expect(origen?.actualizadoEn).toBe('2026-10-12T20:00:00+00:00')
    expect(origen?.uso).toEqual({
      vehiculos: 12,
      cotizaciones: 3,
      camposActivos: 8,
      categorias: 2,
      fases: 5,
      formulaPublicada: true,
      concesiones: 4,
    })
  })

  it('sin fila de uso, todo en cero y la fórmula sin publicar', () => {
    const [origen] = origenesConUsoDesde([FILA], [])
    expect(origen?.uso.vehiculos).toBe(0)
    expect(origen?.uso.formulaPublicada).toBe(false)
  })
})

function origenCon(uso: Partial<OrigenConUso['uso']>): OrigenConUso {
  const [base] = origenesConUsoDesde([FILA], [])
  if (!base) {
    throw new Error('sin origen')
  }
  return { ...base, uso: { ...base.uso, ...uso } }
}

describe('motivoParaNoEliminar', () => {
  it('un origen sin uso se puede eliminar', () => {
    expect(motivoParaNoEliminar(origenCon({}))).toBeNull()
  })

  it('cuenta lo que lo ata y manda a desactivar', () => {
    expect(motivoParaNoEliminar(origenCon({ vehiculos: 12, cotizaciones: 1 }))).toBe(
      '«Corea» tiene 12 vehículos, 1 cotización. Desactívalo en vez de eliminarlo.',
    )
  })

  it('una fórmula publicada también lo ata', () => {
    expect(motivoParaNoEliminar(origenCon({ formulaPublicada: true }))).toContain(
      'una fórmula publicada',
    )
  })

  it('un vehículo se dice en singular', () => {
    expect(motivoParaNoEliminar(origenCon({ vehiculos: 1 }))).toContain('tiene 1 vehículo.')
  })
})

describe('huellaDelOrigen', () => {
  it('no depende de la versión ni de si está activo', () => {
    const [base] = origenesConUsoDesde([FILA], [])
    const [otro] = origenesConUsoDesde(
      [{ ...FILA, actualizado_en: '2026-10-13T00:00:00+00:00', activo: false }],
      [],
    )
    expect(base && otro && huellaDelOrigen(base) === huellaDelOrigen(otro)).toBe(true)
  })

  it('cambia con lo que el formulario muestra', () => {
    const [base] = origenesConUsoDesde([FILA], [])
    const [otro] = origenesConUsoDesde([{ ...FILA, nombre: 'Corea del Sur' }], [])
    expect(base && otro && huellaDelOrigen(base) === huellaDelOrigen(otro)).toBe(false)
  })
})
